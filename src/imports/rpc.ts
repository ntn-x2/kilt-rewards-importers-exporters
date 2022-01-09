import { ApiPromise, HttpProvider, WsProvider } from "@polkadot/api"
import { BN, u8aToHex } from "@polkadot/util"
import { decodeAddress } from "@polkadot/util-crypto"
import type { Codec } from "@polkadot/types/types"

import dotenv from "dotenv"

// Env variables
const ENV_NAMES = {
    rpcEndpoint: "RPC_ENDPOINT",
    rewardedAccountId: "REWARDED_ACCOUNT",
    maxPagesLimit: "MAX_PAGES",
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

// Private interface

type RpcImportEnvVariables = {
    rpcEndpoint: string,
    rewardedAccountId: string,
    rowsPerPage: number,
    fromBlock: BN,
    toBlock?: BN,
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
    pageEventsHandler?: ((events: RewardEventDetails[]) => void)
}

// Events are sorted from newest to oldest.
export async function retrieveAndFilterRewardEventData({ pageEventsHandler = () => {}}: ImportOptions) {
    dotenv.config()
    const envConfig = parseEnvVariables()

    const api = await ApiPromise.create({ provider: new WsProvider(envConfig.rpcEndpoint) })
    
    const relevantTxs: RewardEventDetails[] = []
    const fromBlock = envConfig.fromBlock
    const toBlock = envConfig.toBlock || await api.query.system.number()

    console.log(`Scanning the KILT blockchain using the endpoint at ${envConfig.rpcEndpoint} from block ${fromBlock} to block ${toBlock}...`)

    let currentPage = 0
    let currentBlock = fromBlock
    let pagedTxs: RewardEventDetails[] = []

    // Inspired from https://github.com/KILTprotocol/workbench-js/blob/main/stakingRewards.js
    while (currentBlock <= toBlock) {
        console.log("----------")
        const blockHash = await api.rpc.chain.getBlockHash(currentBlock)
        console.log(`Scanning block # ${blockHash}`)
        const blockEvents = await api.query.system.events.at(blockHash) as Codec[]
        console.log(`${blockEvents.length} events found for this block.`)

        const filteredEvents = block
    }
}

retrieveAndFilterRewardEventData()