import { ApiPromise, WsProvider } from '@polkadot/api'
import { BN } from '@polkadot/util'
import { typeBundleForPolkadot } from '@kiltprotocol/type-definitions'
import 'dotenv'
import { EventRecord } from '@polkadot/types/interfaces'

// Env variables
const ENV_NAMES = {
    rpcEndpoint: 'RPC_ENDPOINT',
    rewardedAccountId: 'REWARDED_ACCOUNT',
    rowsPerPage: 'MAX_ROWS',
    startPage: 'START_PAGE',
    fromBlock: 'FROM_BLOCK',
    toBlock: 'TO_BLOCK',
}

// Default values
const DEFAULTS = {
    [ENV_NAMES.rowsPerPage]: 50,
    [ENV_NAMES.startPage]: 0,
    [ENV_NAMES.fromBlock]: 0,
}

// Other consts
const eventSectionName = 'parachainStaking'
const eventMethodName = 'Rewarded'

// Private interface

type RpcImportEnvVariables = {
    rpcEndpoint: string
    rewardedAccountId: string
    rowsPerPage: number
    fromBlock: BN
    toBlock?: BN
}

type RewardDetails = {
    amount: BN
    account: string
}

function parseEnvVariables(): RpcImportEnvVariables {
    const rpcEndpoint = process.env[ENV_NAMES.rpcEndpoint]
    const rewardedAccountId = process.env[ENV_NAMES.rewardedAccountId]

    if (!rpcEndpoint || !rewardedAccountId) {
        throw new Error(
            `Required env variable not specified. Required env variables are [${ENV_NAMES.rpcEndpoint}, ${ENV_NAMES.rewardedAccountId}].`
        )
    }

    const rowsPerPage = process.env[ENV_NAMES.rowsPerPage]
        ? parseInt(process.env[ENV_NAMES.rowsPerPage]!)
        : DEFAULTS[ENV_NAMES.rowsPerPage]
    const fromBlock = new BN(
        process.env[ENV_NAMES.fromBlock] || DEFAULTS[ENV_NAMES.fromBlock]
    )
    const toBlock = process.env[ENV_NAMES.toBlock]
        ? new BN(process.env[ENV_NAMES.toBlock]!)
        : undefined

    const env = {
        rpcEndpoint,
        rewardedAccountId,
        rowsPerPage,
        fromBlock,
        toBlock,
    }

    console.log(`Env configuration is: ${JSON.stringify(env)}`)
    return env
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
    if (
        event.section !== eventSectionName ||
        event.method !== eventMethodName ||
        event.data.length != 2
    ) {
        return null
    }
    return {
        amount: new BN(event.data[1].toString()),
        account: event.data[0].toString(),
    }
}

// Public interface

export type ImportOptions = {
    pageEventsHandler?: (events: RewardEventDetails[]) => Promise<void>
}

export type RewardEventDetails = {
    amount: BN
    block_timestamp: BN
}

// Events are sorted from newest to oldest.
export async function retrieveAndFilterRewardEventData({
    pageEventsHandler,
}: ImportOptions = {}) {
    const envConfig = parseEnvVariables()

    const api = await ApiPromise.create({
        provider: new WsProvider(envConfig.rpcEndpoint),
        typesBundle: {
            spec: {
                'mashnet-node': typeBundleForPolkadot,
                'kilt-spiritnet': typeBundleForPolkadot,
            },
        },
    })

    const relevantTxs: RewardEventDetails[] = []
    const fromBlock = envConfig.fromBlock
    const toBlock =
        typeof envConfig.toBlock !== 'undefined'
            ? envConfig.toBlock
            : await api.query.system.number().then((n) => new BN(n.toString()))

    console.log(
        `Scanning the KILT blockchain using the endpoint at ${envConfig.rpcEndpoint} from block ${fromBlock} to block ${toBlock}...`
    )

    let currentBlock = fromBlock
    let pagedTxs: RewardEventDetails[] = []
    let skippedBlocks: BN[] = []

    // Inspired from https://github.com/KILTprotocol/workbench-js/blob/main/stakingRewards.js
    while (currentBlock.cmp(toBlock) < 0) {
        const blockHash = await api.rpc.chain.getBlockHash(currentBlock)
        const blockState = await api.at(blockHash)
        const blockTimestamp = await blockState.query.timestamp
            .now()
            .then((t) => new BN(t.toString()))

        // TODO: improve
        let events: EventRecord[]
        try {
            events =
                (await blockState.query.system.events()) as any as EventRecord[]
        } catch (e) {
            console.log(e)
            console.log(`Skipping block ${currentBlock}`)
            skippedBlocks.push(currentBlock)
            currentBlock = currentBlock.addn(1)
            continue
        }
        process.stdout.write(
            `Found ${
                relevantTxs.length
            } events. Scanning block # ${currentBlock} at date ${new Date(
                blockTimestamp.toNumber()
            ).toUTCString()} with ${events.length} events\r`
        )

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
            continue
        }

        const eventDetails = extractRewardData(accountEvent) as RewardDetails
        const fullDetails: RewardEventDetails = {
            amount: eventDetails.amount,
            block_timestamp: blockTimestamp,
        }
        console.log(`\n:) Reward event found! ${JSON.stringify(fullDetails)}`)

        pagedTxs.push(fullDetails)

        // Flush paged txs into total txs
        if (pagedTxs.length === envConfig.rowsPerPage) {
            if (pageEventsHandler) {
                await pageEventsHandler(pagedTxs)
            }
            relevantTxs.push(...pagedTxs)
            pagedTxs = []
        }
    }

    if (pagedTxs.length) {
        console.log('Flushing last txs...')
        if (pageEventsHandler) {
            await pageEventsHandler(pagedTxs)
        }
        relevantTxs.push(...pagedTxs)
    }

    console.log(
        `Scan finished ${
            currentBlock <= toBlock
        } ${currentBlock} ${toBlock} ${currentBlock.cmp(toBlock)}`
    )
    return relevantTxs
}
