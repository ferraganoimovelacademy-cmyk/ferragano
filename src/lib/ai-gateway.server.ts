import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Provider único da Lovable AI. Server-only: a chave nunca sai do handler.
 */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}