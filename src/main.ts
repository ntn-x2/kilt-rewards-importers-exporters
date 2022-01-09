import dotenv from "dotenv"
import { subscan, rpc } from "./imports"
import { koinly } from "./exports"
import { transformSubscanInputToKoinlyOutput } from "./utils"

const novemberEventsHandler: subscan.ImportOptions["pageEventsHandler"] = async (events) => {
    const transformedInput = transformSubscanInputToKoinlyOutput(events)
    await koinly.writeToCsv(transformedInput, "october2021.csv")
}

async function main() {
    dotenv.config()

    await subscan.retrieveAndFilterRewardEventData({ month: "november2021", pageEventsHandler: novemberEventsHandler })
}

main()