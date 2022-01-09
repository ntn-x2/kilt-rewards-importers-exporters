import { ApiPromise, HttpProvider, WsProvider } from "@polkadot/api"
import { BN, u8aToHex } from "@polkadot/util"
import { decodeAddress } from "@polkadot/util-crypto"
import { Codec } from "@polkadot/types/types"

import { formatBalanceAmount } from "../utils"

import dotenv from "dotenv"
import { EventRecord } from "@polkadot/types/interfaces"

// Env variables
const ENV_NAMES = {
    rpcEndpoint: "RPC_ENDPOINT",
    rewardedAccountId: "REWARDED_ACCOUNT",
    rowsPerPage: "MAX_ROWS",
    startPage: "START_PAGE",
    fromBlock: "FROM_BLOCK",
    toBlock: "TO_BLOCK",
}

// Default values
const DEFAULTS = {
    [ENV_NAMES.rowsPerPage]: 50,
    [ENV_NAMES.startPage]: 0,
    [ENV_NAMES.fromBlock]: 0,
}

// Other consts
const eventSectionName = "parachainStaking"
const eventMethodName = "Rewarded"

// Private interface

type RpcImportEnvVariables = {
    rpcEndpoint: string,
    rewardedAccountId: string,
    rowsPerPage: number,
    fromBlock: BN,
    toBlock?: BN,
}

type RewardDetails = {
    amount: BN,
    account: string,
}

function parseEnvVariables(): RpcImportEnvVariables {
    const rpcEndpoint = process.env[ENV_NAMES.rpcEndpoint]
    const rewardedAccountId = process.env[ENV_NAMES.rewardedAccountId]

    if (!rpcEndpoint || !rewardedAccountId) {
        throw new Error(`Required env variable not specified. Required env variables are [${ENV_NAMES.rpcEndpoint}, ${ENV_NAMES.rewardedAccountId}].`)
    }

    const rowsPerPage = process.env[ENV_NAMES.rowsPerPage] ? parseInt(process.env[ENV_NAMES.rowsPerPage]!) : DEFAULTS[ENV_NAMES.rowsPerPage]
    const fromBlock = new BN(process.env[ENV_NAMES.fromBlock] || DEFAULTS[ENV_NAMES.fromBlock])
    const toBlock = process.env[ENV_NAMES.toBlock] ? new BN(process.env[ENV_NAMES.toBlock]!) : undefined

    return {
        rpcEndpoint,
        rewardedAccountId,
        rowsPerPage,
        fromBlock,
        toBlock,
    }
}

async function timeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

function extractRewardData(er: EventRecord): RewardDetails | null {
    const { event } = er
    if (event.section !== eventSectionName || event.method !== eventMethodName || event.data.length != 2) {
        return null
    }
    return {
        amount: new BN(event.data[1].toString()),
        account: event.data[0].toString(),
    }
}

// Public interface

export type ImportOptions = {
    pageEventsHandler?: ((events: RewardEventDetails[]) => void)
}

export type RewardEventDetails = {
    amount: BN,
    block_timestamp: BN,
}

// Events are sorted from newest to oldest.
export async function retrieveAndFilterRewardEventData({ pageEventsHandler }: ImportOptions = {}) {
    const envConfig = parseEnvVariables()

    const api = await ApiPromise.create({ provider: new WsProvider(envConfig.rpcEndpoint) })
    
    const relevantTxs: RewardEventDetails[] = []
    const fromBlock = envConfig.fromBlock
    const toBlock = envConfig.toBlock || api.query.system.number().then((n) => new BN(n.toString()))

    console.log(`Scanning the KILT blockchain using the endpoint at ${envConfig.rpcEndpoint} from block ${fromBlock} to block ${toBlock}...`)

    let currentPage = 0
    let currentBlock = fromBlock
    let pagedTxs: RewardEventDetails[] = []

    // Inspired from https://github.com/KILTprotocol/workbench-js/blob/main/stakingRewards.js
    while (currentBlock <= toBlock) {
        console.log("----------")
        const blockHash = await api.rpc.chain.getBlockHash(currentBlock)
        const blockState = await api.at(blockHash)
        const blockTimestamp = await blockState.query.timestamp.now().then((t) => new BN(t.toString()))

        // FIXME
        console.log(`Scanning block # ${currentBlock} at date ${new Date(blockTimestamp.toNumber()).toUTCString()}`)

        // TODO: improve
        let events: EventRecord[]
        try {
            events = (await blockState.query.system.events() as any) as EventRecord[]
        } catch(e) {
            console.log(e)
            console.log("Skipping this block...")
            currentBlock = currentBlock.addn(1)
            continue
        }

        console.log(`${events.length} events found.`)

        const accountEvent = events.find((e: EventRecord) => {
            const parsedRewardData = extractRewardData(e)
            if (!parsedRewardData) {
                return false
            }
            return parsedRewardData.account === envConfig.rewardedAccountId
        })

        // Increase at the beginning, so we can fail anywhere inside here
        currentBlock = currentBlock.addn(1)

        if (!accountEvent) {
            console.log(":( No reward found in the block for the provided account.")
            continue
        }

        const eventDetails = extractRewardData(accountEvent) as RewardDetails
        const fullDetails: RewardEventDetails = {
            amount: eventDetails.amount,
            block_timestamp: blockTimestamp,
        }
        console.log(":) Reward event found!")
        console.log(JSON.stringify(fullDetails, undefined, 2))

        pagedTxs.push(fullDetails)

        console.log(`# of relevant events captured so far: ${relevantTxs.length + pagedTxs.length}.`)

        // Flush paged txs into total txs
        if (pagedTxs.length === envConfig.rowsPerPage) {
            if (pageEventsHandler) {
                await pageEventsHandler(pagedTxs)
            }
            relevantTxs.push(...pagedTxs)
            pagedTxs = []
        }

        console.log("----------")
    }
    
    console.log(`Total # of relevant events captured: ${relevantTxs.length}.`)
    return relevantTxs
}