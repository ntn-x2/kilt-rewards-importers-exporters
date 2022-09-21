import path from "path"
import type { BN } from "@polkadot/util"
import fs from "fs/promises"

// Env variables

const ENV_NAMES = {
    outDir: "OUT_DIR",
    fileName: "OUT_FILE",
    dryRun: "KOINLY_OUT_DRY_RUN"
}

// Default values
const DEFAULTS = {
    // Defaults to the project root.
    [ENV_NAMES.outDir]: path.join(__dirname, "../.."),
    [ENV_NAMES.fileName]: "out.csv",
    [ENV_NAMES.dryRun]: false,
}

// Other consts
const CSV_HEADER = "Koinly Date,Amount,Currency,Label,TxHash"
const CURRENCY_NAME = "KILT"
const LABEL_NAME = "staking"

// Private interface

type KoinlyExportEnvVariables = {
    outDir: string,
    fileName: string,
    dryRun: boolean,
}

function parseEnvVariables(): KoinlyExportEnvVariables {
    const outDir = path.resolve(process.env[ENV_NAMES.outDir] || DEFAULTS[ENV_NAMES.outDir] as string)
    const fileName = process.env[ENV_NAMES.fileName] || DEFAULTS[ENV_NAMES.fileName] as string
    const dryRun = (process.env[ENV_NAMES.dryRun] || DEFAULTS[ENV_NAMES.dryRun]) as boolean

    return {
        outDir,
        fileName,
        dryRun,
    }
}

async function exists(path: string): Promise<boolean> {
    try {
        await fs.access(path)
        return true
    } catch {
        return false
    }
}

// Return the full resolved path where the file is created
async function prepareFile(config: KoinlyExportEnvVariables): Promise<string> {
    const completePath = path.resolve(config.outDir, config.fileName)
    if (await exists(completePath)) {
        return completePath
    }
    console.log(`Output CSV ${completePath} does not exist. Creating a new one...`)
    await fs.mkdir(path.resolve(config.outDir), { recursive: true })
    await fs.writeFile(completePath, CSV_HEADER.concat("\n"))

    return completePath
}

function formatTimestampToExpectedDate(timestamp: BN): string {
    // FIXME
    const dateFromTimestamp = new Date(timestamp.toNumber() * 1000)
    const [year, month, day] = [dateFromTimestamp.getUTCFullYear(), dateFromTimestamp.getUTCMonth() + 1, dateFromTimestamp.getUTCDate()]
    const [hour, minute] = [dateFromTimestamp.getUTCHours(), dateFromTimestamp.getUTCMinutes()]
    return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")} ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} UTC`
}

// Public interface

export type InputEventDetails = {
    // UNIX epoch
    timestamp: BN,
    amount: string,
    txHash: string
}

// fileName overwrites potential env variables
export async function writeToCsv(eventDetails: InputEventDetails[], fileName?: string) {
    let envConfig = parseEnvVariables()
    if (fileName) {
        envConfig.fileName = fileName
    }

    const result = eventDetails.map((event) => {
        const formattedDate = formatTimestampToExpectedDate(event.timestamp)
        const formattedAmount = event.amount.toString()
        return `${formattedDate},${formattedAmount},${CURRENCY_NAME},${LABEL_NAME},${event.txHash}`
    })

    console.log("++++++++++")

    if (envConfig.dryRun) {
        console.log("Koinly export dry run detected. Not saving to file.")
    } else {
        const filePath = await prepareFile(envConfig)
        if (result.length > 0) {
            console.log(`Writing txs to ${filePath}...`)
            // FIXME
            await result.forEach(async (r) => await fs.appendFile(filePath, r.concat("\n")))
        } else {
            console.log("No txs to export.")
        }
    }

    console.log("++++++++++")
}