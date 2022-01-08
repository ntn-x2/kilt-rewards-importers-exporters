import dotenv from "dotenv"
import { subscan } from "./imports"
import { koinly } from "./exports"
import { transformSubscanInputToKoinlyOutput } from "./utils"

const octoberEventsHandler: subscan.ImportOptions["pageEventsHandler"] = async (events) => {
    const transformedInput = transformSubscanInputToKoinlyOutput(events)
    await koinly.writeToCsv(transformedInput, "october2021.csv")
}

async function main() {
    dotenv.config()

    await subscan.retrieveAndFilterRewardEventData({ month: "october2021", pageEventsHandler: octoberEventsHandler })
}

main()