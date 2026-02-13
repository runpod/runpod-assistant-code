import { cmd } from "./cmd"
import * as prompts from "@clack/prompts"
import { UI } from "../ui"
import { Auth } from "../../auth"
import { Instance } from "../../project/instance"
import { RunPod } from "../../provider/runpod"
import { Config } from "../../config/config"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

// Runpod brand purple
const PURPLE = "\x1b[38;5;135m"
const PURPLE_BOLD = "\x1b[38;5;135m\x1b[1m"
const RESET = "\x1b[0m"

function loadLogo(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const logoPath = path.join(dir, "..", "runpod-logo.txt")
  try {
    return fs.readFileSync(logoPath, "utf-8")
  } catch {
    return ""
  }
}

export const RunpodCommand = cmd({
  command: "runpod",
  describe: "Runpod setup and management",
  builder: (yargs) => yargs.command(RunpodSetupCommand).command(RunpodTiersCommand).demandCommand(),
  async handler() {},
})

export const RunpodTiersCommand = cmd({
  command: "tiers",
  describe: "list available Runpod model tiers",
  async handler() {
    UI.empty()
    prompts.intro(`${PURPLE_BOLD}Runpod Model Tiers${RESET}`)

    const tierData = RunPod.tiers()
    for (const [name, tier] of Object.entries(tierData)) {
      prompts.log.info(
        `${PURPLE_BOLD}${name}${RESET} - ${tier.name}\n` +
          `  Model: ${tier.modelId}\n` +
          `  Context: ${(tier.context / 1024).toFixed(0)}k tokens\n` +
          `  Cost: $${tier.cost.input}/M input, $${tier.cost.output}/M output`,
      )
    }

    prompts.outro(`${Object.keys(tierData).length} tiers available`)
  },
})

export const RunpodSetupCommand = cmd({
  command: "setup",
  describe: "configure Runpod as your AI provider",
  async handler() {
    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        UI.empty()
        const logo = loadLogo()
        if (logo) UI.println(PURPLE + logo + RESET)
        UI.empty()
        prompts.intro(`${PURPLE_BOLD}RUNPOD ASSISTANT FIRST-TIME SETUP${RESET}`)

        prompts.log.info(
          `Configure your global assistant settings. Select options with the\narrow keys, and press ${PURPLE}ENTER${RESET} to continue.`,
        )

        // Step 1: API credentials
        prompts.log.step(`${PURPLE_BOLD}STEP 1: API CREDENTIALS${RESET}`)

        const apiKey = await prompts.password({
          message: "Enter your Runpod API key",
          validate: (x) => (x && x.length > 0 ? undefined : "Required"),
        })
        if (prompts.isCancel(apiKey)) throw new UI.CancelledError()

        const spinner = prompts.spinner()
        spinner.start("Validating API key...")

        let user: Awaited<ReturnType<typeof RunPod.validate>>
        try {
          user = await RunPod.validate(apiKey)
        } catch (e) {
          spinner.stop("Validation failed", 1)
          prompts.log.error(e instanceof Error ? e.message : "Invalid API key")
          prompts.outro("Setup cancelled")
          return
        }

        spinner.stop(`Authenticated as ${PURPLE}${user.email}${RESET}`)

        if (user.currentSpendPerHr !== undefined) {
          prompts.log.info(`Current spend: $${user.currentSpendPerHr.toFixed(4)}/hr`)
        }

        await Auth.set("runpod", { type: "api", key: apiKey })
        prompts.log.success("API key saved")

        // Step 2: Model selection
        prompts.log.step(`${PURPLE_BOLD}STEP 2: DEFAULT MODEL${RESET}`)

        const tierData = RunPod.tiers()
        const tierEntries = Object.entries(tierData)

        let selectedTier: string
        if (tierEntries.length === 1) {
          const [name, tier] = tierEntries[0]
          selectedTier = name
          prompts.log.info(`Using ${PURPLE_BOLD}${tier.name}${RESET} (${tier.modelId})`)
        } else {
          const tier = await prompts.select({
            message: "Select a default model",
            options: tierEntries.map(([name, t]) => ({
              label: `${name} - ${t.name}`,
              value: name,
              hint: `$${t.cost.input}/M input, $${t.cost.output}/M output`,
            })),
          })
          if (prompts.isCancel(tier)) throw new UI.CancelledError()
          selectedTier = tier
        }

        const defaultModel = `runpod/${selectedTier}`
        try {
          await Config.updateGlobal({ model: defaultModel })
          prompts.log.success(`Default model set to ${PURPLE}${defaultModel}${RESET}`)
        } catch {
          prompts.log.warn(`Could not write global config. Set "model": "${defaultModel}" in your opencode.json`)
        }

        // Summary
        prompts.log.step(`${PURPLE_BOLD}CONFIGURATION SUMMARY${RESET}`)
        const tier = tierData[selectedTier]
        prompts.log.info(
          `Provider        ${PURPLE_BOLD}Runpod${RESET}\n` +
            `Model           ${PURPLE}${tier.name}${RESET} (${tier.modelId})\n` +
            `Account         ${user.email}`,
        )

        prompts.outro(`Settings updated. ${PURPLE_BOLD}You're ready to start building!${RESET}`)
      },
    })
  },
})
