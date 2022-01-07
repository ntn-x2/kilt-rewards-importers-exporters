import type { AxiosRequestConfig } from "axios"
import axios from "axios"
import { BN } from "@polkadot/util"
import { decodeAddress } from "@polkadot/util-crypto"
import { u8aToHex } from "@polkadot/util"

// Env variables
const subscanApiKeyEnvName = "SUBSCAN_API_KEY"
const rewardedAccountIdEnvName = "REWARDED_ACCOUNT"
const maxPagesLimitEnvName = "MAX_PAGES"
const rowsPerPageEnvName = "MAX_ROWS"
const startPageEnvName = "START_PAGE"

// Default values
const defaultRowsPerPage = 50
const defaultStartPage = 0

// Other consts
const subscanEventsSpiritnetEndpoint = "https://spiritnet.api.subscan.io/api/scan/events"

export type EnvVariables = {
    subscanApiKey: string,
    rewardedAccountId: string,
    rowsPerPage: number,
    startPage: number,
    maxPagesLimit?: number,
}

export function parseEnvVariables(): EnvVariables {
    const subscanApiKey = process.env[subscanApiKeyEnvName]
    const rewardedAccountId = process.env[rewardedAccountIdEnvName]

    if (!subscanApiKey || !rewardedAccountId) {
        throw new Error(`Required env variable not specified. Required env variables are [${subscanApiKeyEnvName}, ${rewardedAccountIdEnvName}].`)
    }

    const rowsPerPage = process.env[maxPagesLimitEnvName] ? parseInt(process.env[rowsPerPageEnvName]!) : defaultRowsPerPage
    const startPage = process.env[startPageEnvName] ? parseInt(process.env[startPageEnvName]!) : defaultStartPage
    const maxPagesLimit = process.env[maxPagesLimitEnvName] ? parseInt(process.env[maxPagesLimitEnvName]!) : undefined

    return {
        subscanApiKey,
        rewardedAccountId,
        rowsPerPage,
        startPage,
        maxPagesLimit,
    }
}

export type RequestBuildOptions = {
    month: "september2021" | "october2021" | "november2021" | "december2021"
}

// Month timestamps hardcoded as retrieved from the Subscan UI at https://spiritnet.subscan.io
function buildRewardEventRequestOptions(page: number, envConfig: Pick<EnvVariables, "subscanApiKey" | "rowsPerPage">, reqConfig: RequestBuildOptions): AxiosRequestConfig {
    let [from, to]: [number, number] = [0, 0]
    switch (reqConfig.month) {
        case "september2021": {
            [from, to] = [1630454400, 1633046399]
            break
        }
        case "october2021": {
            [from, to] = [1633046400, 1635724799]
            break
        }
        case "november2021": {
            [from, to] = [1635724800, 1638316799]
            break
        }
        case "december2021": {
            [from, to] = [1638316800, 1640995199]
            break
        }
    }
    return {
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": envConfig.subscanApiKey,
        },
        method: "POST",
        data: JSON.stringify({
            row: envConfig.rowsPerPage,
            page,
            // from,
            // to,
            module: "parachainstaking",
            call: "rewarded",
        })
    }
}

// Each event is modeled as required by Koinly https://help.koinly.io/en/articles/3662999-how-to-create-a-custom-csv-file-with-your-data
export type EventDetails = {
    timestamp: number,
    amount: BN,
}

export async function retrieveAndFilterRewardEventData(month: RequestBuildOptions["month"]): Promise<EventDetails[]> {
    const envConfig = parseEnvVariables()
    // Event has info about the public key and not the account address
    const addressPublicKey = u8aToHex(decodeAddress(envConfig.rewardedAccountId, false, 38))
    const relevantTxs: EventDetails[] = []

    let reqOptions: AxiosRequestConfig
    let lastEventId: string | undefined
    let nextPage = envConfig.startPage

    console.log(`Starting the retrieval process from page ${envConfig.startPage} fetching ${envConfig.rowsPerPage} rows per page for address ${envConfig.rewardedAccountId} (pubkey ${addressPublicKey}).`)
    if (envConfig.maxPagesLimit) {
        console.log(`!!! Manual page limit found. Retrieval will stop after ${envConfig.maxPagesLimit} pages have been retrieved.`)
    }

    while (true) {
        console.log("----------")
        const extrinsicInfo = lastEventId ? `, last event ID checked: ${lastEventId}` : ""
        console.log(`Processing page ${nextPage}${extrinsicInfo}...`)
        reqOptions = buildRewardEventRequestOptions(nextPage, envConfig, { month })
        const response = await axios(subscanEventsSpiritnetEndpoint, reqOptions)
        const rawEvents = response.data.data.events
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
            console.log(e)
            return e.params[0].value === addressPublicKey
        })

        console.log(`${parsedEvents.length} relevant events found.`)

        parsedEvents = parsedEvents.map((e: any): EventDetails => {
            return {
                timestamp: e.block_timestamp,
                amount: new BN(e.params[1].value)
            }
        })

        console.log(JSON.stringify(parsedEvents, undefined, 2))

        relevantTxs.push(...parsedEvents)

        console.log(`# of relevant events captured so far: ${relevantTxs.length}.`)

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