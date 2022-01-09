import { subscan, rpc } from "./imports"
import { koinly } from "./exports"
import { BN } from '@polkadot/util'

const KILT_DECIMALS = 15

export function formatBalanceAmount(amount: BN): number {
    // FIXME
    return amount.toNumber() * Math.pow(10, -KILT_DECIMALS)
}

export function transformSubscanInputToKoinlyOutput(input: subscan.RewardEventDetails[]): koinly.InputEventDetails[] {
    return input.map((input): koinly.InputEventDetails => {
        return {
            amount: formatBalanceAmount(input.details.amount).toPrecision(KILT_DECIMALS).toString(),
            timestamp: input.block_timestamp,
            txHash: input.event_index
        }
    })
}

export function transformRpcInputToKoinlyOutput(input: rpc.RewardEventDetails[]): koinly.InputEventDetails[] {
    return input.map((input): koinly.InputEventDetails => {
        return {
            amount: formatBalanceAmount(input.amount).toPrecision(KILT_DECIMALS).toString(),
            timestamp: input.block_timestamp.divn(1000),
            // No txHash info from rpc (with this approach)
            txHash: ""
        }
    })
}