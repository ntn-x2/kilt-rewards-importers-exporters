import dotenv from 'dotenv'
import { rpc } from './imports'
import { koinly } from './exports'
import { transformRpcInputToKoinlyOutput } from './utils'

const OUT_DIR = 'OUT_DIR'

const octoberEventsHandler: rpc.ImportOptions['pageEventsHandler'] = async (
    events
): Promise<void> => {
    const transformedInput = transformRpcInputToKoinlyOutput(events)
    return koinly.writeToCsv(transformedInput, process.env[OUT_DIR])
}

async function main() {
    dotenv.config()

    // Testing October retrieval
    await rpc.retrieveAndFilterRewardEventData({
        pageEventsHandler: octoberEventsHandler,
    })
}

main()
