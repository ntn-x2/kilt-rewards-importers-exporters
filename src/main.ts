import dotenv from "dotenv"
import { subscan, rpc } from "./imports"
import { koinly } from "./exports"
import { transformRpcInputToKoinlyOutput } from "./utils"

const octoberEventsHandler: rpc.ImportOptions["pageEventsHandler"] = async (events) => {
    const transformedInput = transformRpcInputToKoinlyOutput(events)
    await koinly.writeToCsv(transformedInput, "october2021.csv")
}

async function main() {
    dotenv.config()

    // Testing October retrieval
    await rpc.retrieveAndFilterRewardEventData({ pageEventsHandler: octoberEventsHandler })
}

main()