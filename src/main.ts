import dotenv from "dotenv"
import { subscan, rpc } from "./imports"
import { koinly } from "./exports"
import { transformRpcInputToKoinlyOutput } from "./utils"

const octoberEventsHandler: rpc.ImportOptions["pageEventsHandler"] = async (events): Promise<void> => {
    const transformedInput = transformRpcInputToKoinlyOutput(events)
    return koinly.writeToCsv(transformedInput, "october2021.csv")
}

async function main() {
    dotenv.config()

    // Testing October retrieval
    await rpc.retrieveAndFilterRewardEventData({ pageEventsHandler: octoberEventsHandler })
}

main()