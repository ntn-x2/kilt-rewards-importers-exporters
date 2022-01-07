import { retrieveAndFilterRewardEventData } from "./utils"
import dotenv from "dotenv"

async function main() {
    dotenv.config()

    const septemberEvents = await retrieveAndFilterRewardEventData("september2021")
}

main()