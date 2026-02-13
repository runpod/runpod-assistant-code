import type { ModelsDev } from "./models"

export namespace RunPod {
  // Each tier maps to a Runpod public serverless endpoint.
  // Add more tiers here as endpoints become available.
  const TIERS = {
    "glm-4.7-flash": {
      endpointId: "tmirn00irdwrp9",
      modelId: "glm-4.7-flash",
      name: "GLM 4.7 Flash",
      context: 202752,
      output: 8192,
      cost: { input: 0.5, output: 0.5 },
    },
  } as const satisfies Record<string, TierConfig>

  interface TierConfig {
    endpointId: string
    modelId: string
    name: string
    context: number
    output: number
    cost: { input: number; output: number }
  }

  export type TierName = keyof typeof TIERS

  export const TIER_NAMES = Object.keys(TIERS) as TierName[]

  export function endpointUrl(endpointId: string): string {
    return `https://api.runpod.ai/v2/${endpointId}/openai/v1`
  }

  export function tiers(): Record<string, TierConfig> {
    return { ...TIERS }
  }

  /**
   * Validate a Runpod API key by querying the GraphQL API for the current user.
   * Returns the user's email and spending limit on success, or throws on failure.
   */
  export async function validate(apiKey: string): Promise<{ email: string; currentSpendPerHr?: number }> {
    const response = await fetch("https://api.runpod.io/graphql?api_key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query { myself { email currentSpendPerHr } }`,
      }),
    })
    if (!response.ok) {
      throw new Error(`Runpod API returned ${response.status}`)
    }
    const json = (await response.json()) as {
      data?: { myself?: { email: string; currentSpendPerHr?: number } }
      errors?: Array<{ message: string }>
    }
    if (json.errors?.length) {
      throw new Error(json.errors[0].message)
    }
    if (!json.data?.myself) {
      throw new Error("Invalid API key")
    }
    return json.data.myself
  }

  /**
   * Build a ModelsDev.Provider shape for the Runpod provider.
   * Each tier becomes a model entry with its own per-model endpoint URL.
   */
  export function provider(): ModelsDev.Provider {
    const models: Record<string, ModelsDev.Model> = {}

    for (const [tierName, tier] of Object.entries(TIERS)) {
      models[tierName] = {
        id: tier.modelId,
        name: tier.name,
        release_date: "2025-01-01",
        attachment: false,
        reasoning: tier.modelId.toLowerCase().includes("qwen") || tier.modelId.toLowerCase().includes("glm"),
        temperature: true,
        tool_call: true,
        cost: {
          input: tier.cost.input,
          output: tier.cost.output,
        },
        limit: {
          context: tier.context,
          output: tier.output,
        },
        options: {},
        provider: {
          npm: "@ai-sdk/openai-compatible",
          api: endpointUrl(tier.endpointId),
        },
      }
    }

    return {
      id: "runpod",
      name: "Runpod",
      env: ["RUNPOD_API_KEY"],
      models,
    }
  }
}
