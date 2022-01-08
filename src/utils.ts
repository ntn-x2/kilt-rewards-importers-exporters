import { subscan } from "./imports"
import { koinly } from "./exports"
import { BN } from '@polkadot/util'

const KILT_DECIMALS = 15

export function transformSubscanInputToKoinlyOutput(input: subscan.RewardEventDetails[]): koinly.InputEventDetails[] {
    return input.map((input): koinly.InputEventDetails => {
        // FIXME
        const formattedAmount = input.details.amount.toNumber() * Math.pow(10, -KILT_DECIMALS)
        return {
            amount: formattedAmount.toPrecision(KILT_DECIMALS).toString(),
            timestamp: input.block_timestamp,
            txHash: input.event_index
        }
    })
}