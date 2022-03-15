import type { AxiosRequestConfig, AxiosResponse } from "axios"
import axios from "axios"
import { BN, u8aToHex } from "@polkadot/util"
import { decodeAddress } from "@polkadot/util-crypto"

// Env variables
const ENV_NAMES = {
    subscanApiKey: "SUBSCAN_API_KEY",
    rewardedAccountId: "REWARDED_ACCOUNT",
    maxPagesLimit: "MAX_PAGES",
    rowsPerPage: "MAX_ROWS",
    startPage: "START_PAGE",
    maxAttempts: "MAX_ATTEMPTS",
    retryTimeout: "RETRY_TIMEOUT",
    fromTimestamp: "FROM_TIMESTAMP",
    toTimestamp: "TO_TIMESTAMP",
}

// Default values
const DEFAULTS = {
    [ENV_NAMES.rowsPerPage]: 50,
    [ENV_NAMES.startPage]: 0,
    [ENV_NAMES.maxAttempts]: 5,
    [ENV_NAMES.retryTimeout]: 5,
}

// Other consts
const API_ENDPOINT = "https://spiritnet.api.subscan.io/api/scan/events"

// Private interface

type SubscanImportEnvVariables = {
    subscanApiKey: string,
    rewardedAccountId: string,
    rowsPerPage: number,
    startPage: number,
    maxAttempts: number,
    retryTimeout: number,
    fromTimestamp?: number,
    toTimestamp?: number,
    maxPagesLimit?: number,
}

function parseEnvVariables(): SubscanImportEnvVariables {
    const subscanApiKey = process.env[ENV_NAMES.subscanApiKey]
    const rewardedAccountId = process.env[ENV_NAMES.rewardedAccountId]

    if (!subscanApiKey || !rewardedAccountId) {
        throw new Error(`Required env variable not specified. Required env variables are [${ENV_NAMES.subscanApiKey}, ${ENV_NAMES.rewardedAccountId}].`)
    }

    const rowsPerPage = process.env[ENV_NAMES.rowsPerPage] ? parseInt(process.env[ENV_NAMES.rowsPerPage]!) : DEFAULTS[ENV_NAMES.rowsPerPage]
    const startPage = process.env[ENV_NAMES.startPage] ? parseInt(process.env[ENV_NAMES.startPage]!) : DEFAULTS[ENV_NAMES.startPage]
    const maxAttempts = process.env[ENV_NAMES.maxAttempts] ? parseInt(process.env[ENV_NAMES.maxAttempts]!) : DEFAULTS[ENV_NAMES.maxAttempts]
    const retryTimeout = process.env[ENV_NAMES.retryTimeout] ? parseInt(process.env[ENV_NAMES.retryTimeout]!) : DEFAULTS[ENV_NAMES.retryTimeout]
    const fromTimestamp = process.env[ENV_NAMES.fromTimestamp] ? parseInt(process.env[ENV_NAMES.fromTimestamp]!) : undefined
    const toTimestamp = process.env[ENV_NAMES.toTimestamp] ? parseInt(process.env[ENV_NAMES.toTimestamp]!) : undefined
    const maxPagesLimit = process.env[ENV_NAMES.maxPagesLimit] ? parseInt(process.env[ENV_NAMES.maxPagesLimit]!) : undefined

    return {
        subscanApiKey,
        rewardedAccountId,
        rowsPerPage,
        startPage,
        maxAttempts,
        retryTimeout,
        fromTimestamp,
        toTimestamp,
        maxPagesLimit,
    }
}

// Month timestamps hardcoded as retrieved from the Subscan UI at https://spiritnet.subscan.io
function buildRewardEventRequestOptions(page: number, config: Pick<SubscanImportEnvVariables, "subscanApiKey" | "rowsPerPage" | "fromTimestamp" | "toTimestamp">, options: Pick<ImportOptions, "month" | "from" | "to">): AxiosRequestConfig {
    let [computed_from, computed_to]: [number, number] = [0, 0]
    switch (options.month) {
        case "september2021": {
            [computed_from, computed_to] = [1630454400, 1633046399]
            break
        }
        case "october2021": {
            [computed_from, computed_to] = [1633046400, 1635724799]
            break
        }
        case "november2021": {
            [computed_from, computed_to] = [1635724800, 1638316799]
            break
        }
        case "december2021": {
            [computed_from, computed_to] = [1638316800, 1640995199]
            break
        }
    }

    if (config.fromTimestamp) {
        computed_from = config.fromTimestamp
    }
    if (config.toTimestamp) {
        computed_to = config.toTimestamp
    }

    // Options have priority over the env variables, if specified.
    if (options.from) {
        computed_from = options.from
    }
    if (options.to) {
        computed_to = options.to
    }

    return {
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": config.subscanApiKey,
        },
        method: "POST",
        data: JSON.stringify({
            row: config.rowsPerPage,
            page,
            from: computed_from,
            to: computed_to,
            module: "parachainstaking",
            call: "rewarded",
        }),
        timeout: 120000,        // 2 min
    }
}

async function timeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

// Public interface

export type RewardEventDetails = {
    event_index: string,
    block_num: BN,
    extrinsic_idx: BN,
    event_idx: BN,
    extrinsic_hash: string,
    block_timestamp: BN,
    finalized: boolean,
    details: {
        amount: BN,
    },
}

export type ImportOptions = {
    month: "september2021" | "october2021" | "november2021" | "december2021",
    // Can be used to resume fetching data for a given month from a given timestamp
    from?: number,
    // Can be used to resume fetching data for a given month until a given timestamp
    to?: number,
    pageEventsHandler?: ((events: RewardEventDetails[]) => Promise<void>)
}

// Events are sorted from newest to oldest.
export async function retrieveAndFilterRewardEventData({ month, pageEventsHandler, to, from }: ImportOptions): Promise<RewardEventDetails[]> {
    const envConfig = parseEnvVariables()
    // Event has info about the public key and not the account address
    const addressPublicKey = u8aToHex(decodeAddress(envConfig.rewardedAccountId, false, 38))
    const relevantTxs: RewardEventDetails[] = []

    let reqOptions: AxiosRequestConfig
    let lastEventId: string | undefined
    let nextPage = envConfig.startPage
    let attempts = 1

    console.log(`Starting the retrieval process using ${API_ENDPOINT} from page ${envConfig.startPage} fetching ${envConfig.rowsPerPage} rows per page for address ${envConfig.rewardedAccountId} (pubkey ${addressPublicKey}).`)
    if (envConfig.maxPagesLimit) {
        console.log(`!!! Manual page limit found. Retrieval will stop after ${envConfig.maxPagesLimit} pages have been retrieved.`)
    }

    while (true) {
        console.log("----------")
        // Resetting attempts for next request
        attempts = 0
        const extrinsicInfo = lastEventId ? `, last event ID checked: ${lastEventId}` : ""
        console.log(`Processing page ${nextPage}${extrinsicInfo}...`)
        reqOptions = buildRewardEventRequestOptions(nextPage, envConfig, { month, to, from })
        let response: AxiosResponse<any> | undefined = undefined
        while (!response && attempts <= envConfig.maxAttempts) {
            try {
                response = await axios(API_ENDPOINT, reqOptions)
            } catch {
                console.warn(`Attempt n. ${attempts} failed. Retrying in ${envConfig.retryTimeout} seconds...`)
                await timeout(envConfig.retryTimeout * 1000)
                attempts += 1
            }
        }
        const rawEvents = response!.data.data.events
        // We'll hit it eventually, after the last page is retrieved
        if (!rawEvents || !rawEvents.length) {
            console.log(`No more events found. Terminating...`)
            break
        }

        let parsedEvents = rawEvents.map((e: any) => {
            return {
                block_num: e.block_num,
                params: JSON.parse(e.params),
                event_index: `${e.event_index.split("-")[0]}-${e.event_idx}`,
                extrinsic_hash: e.extrinsic_hash,
                block_timestamp: e.block_timestamp,
            }
        })

        lastEventId = parsedEvents.slice(-1)[0].event_index

        console.log(`${parsedEvents.length} new events found.`)

        parsedEvents = parsedEvents.filter((e: any) => {
            let eventPublicKey = e.params[0].value as string
            // Sometimes param has leading 0x, sometimes it does not.
            if (!eventPublicKey.startsWith("0x")) {
                eventPublicKey = "0x".concat(eventPublicKey)
            }
            return e.params[0].value === addressPublicKey
        })

        console.log(`${parsedEvents.length} relevant events found.`)

        parsedEvents = parsedEvents.map((e: any): RewardEventDetails => {
            return {
                event_index: e.event_index,
                block_num: new BN(e.block_num),
                extrinsic_idx: new BN(e.extrinsic_idx),
                event_idx: new BN(e.event_idx),
                extrinsic_hash: e.extrinsic_hash,
                block_timestamp: new BN(e.block_timestamp),
                finalized: e.finalized as boolean,
                details: {
                    amount: new BN(e.params[1].value)
                }
            }
        })

        console.log(JSON.stringify(parsedEvents, undefined, 2))

        relevantTxs.push(...parsedEvents)

        console.log(`# of relevant events captured so far: ${relevantTxs.length}.`)

        // Call handler, if specified
        if (pageEventsHandler) {
            await pageEventsHandler(parsedEvents)
        }

        console.log("----------")

        nextPage += 1
        if (envConfig.maxPagesLimit && nextPage >= envConfig.maxPagesLimit) {
            console.log("Page limit reached. Terminating...")
            break
        }
    }

    console.log(`Total # of relevant events captured: ${relevantTxs.length}.`)
    return relevantTxs
}