import { hasDeepSeekKey } from "@/server/core/config";
import type {
  AIDietProvider,
  AIDietProviderRequest,
  AIDietProviderResponse,
} from "@/server/ai-diet-assistant/providers/types";
import { AI_DISCLAIMER } from "@/server/ai-diet-assistant/providers/types";

const SYSTEM_PROMPT = `Você é um assistente nutricional. Responda sempre em português do Brasil.
Forneça sugestões práticas de alimentação com base no contexto JSON do usuário.
Inclua no final: "${AI_DISCLAIMER}"`;

export class DeepSeekProvider implements AIDietProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateSuggestion(request: AIDietProviderRequest): Promise<AIDietProviderResponse> {
    const body = {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({ intent: request.intent, ...request.context }),
        },
      ],
      max_tokens: 800,
      temperature: 0.4,
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25_000);
        const response = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.status >= 500 && attempt === 0) continue;

        if (!response.ok) {
          throw new Error(`DeepSeek error: ${response.status}`);
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };

        return {
          suggestion: data.choices?.[0]?.message?.content ?? "",
          tokensPrompt: data.usage?.prompt_tokens,
          tokensCompletion: data.usage?.completion_tokens,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === 0) continue;
      }
    }
    throw lastError ?? new Error("Falha ao chamar DeepSeek");
  }
}

export function getAIDietProvider(): AIDietProvider | null {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!hasDeepSeekKey() || !key) return null;
  return new DeepSeekProvider(key);
}
