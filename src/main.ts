import dotenv from "dotenv"
import { subscan } from "./imports"
import { koinly } from "./exports"
import { transformSubscanInputToKoinlyOutput } from "./utils"

async function main() {
    dotenv.config()

    const octoberEventsHandler: subscan.ImportOptions["pageEventsHandler"] = async (events) => {
        const transformedInput = transformSubscanInputToKoinlyOutput(events)
        await koinly.writeToCsv(transformedInput, "october2021.csv")
    }

    await subscan.retrieveAndFilterRewardEventData({ month: "october2021", pageEventsHandler: octoberEventsHandler })
}

main()