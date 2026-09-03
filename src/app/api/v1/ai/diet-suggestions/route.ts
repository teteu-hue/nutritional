import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { aiIntentSchema } from "@/server/food-catalog/schemas";
import { buildRedactedContext } from "@/server/ai-diet-assistant/redact";
import { getAIDietProvider } from "@/server/ai-diet-assistant/providers/deepseek";
import { AI_DISCLAIMER } from "@/server/ai-diet-assistant/providers/types";
import { rateLimit, assertRateLimitAllowed } from "@/server/ai-diet-assistant/rate-limit";
import { prisma } from "@/server/core/db";
import { hasDeepSeekKey } from "@/server/core/config";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const parsed = aiIntentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "O intent é obrigatório");
    }

    if (!hasDeepSeekKey()) {
      throw new ApiError(503, "Serviço de IA não configurado");
    }

    const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    if (!profile || !user.onboardingCompletedAt) {
      throw new ApiError(422, "Complete seu perfil nutricional antes de usar o assistente");
    }

    const rl = await rateLimit({ userId: user.id, scope: "ai_diet_suggestion" });
    assertRateLimitAllowed(rl);

    const context = await buildRedactedContext(user.id, parsed.data.intent);
    const provider = getAIDietProvider();
    if (!provider) {
      throw new ApiError(503, "Serviço de IA não configurado");
    }

    try {
      const result = await provider.generateSuggestion({ intent: parsed.data.intent, context });
      const interaction = await prisma.aiInteraction.create({
        data: {
          userId: user.id,
          intent: parsed.data.intent,
          redactedContext: context,
          response: result.suggestion,
          tokensPrompt: result.tokensPrompt,
          tokensCompletion: result.tokensCompletion,
          status: "success",
        },
      });

      return jsonOk({
        suggestion: result.suggestion,
        disclaimer: AI_DISCLAIMER,
        interactionId: interaction.id,
      });
    } catch (err) {
      await prisma.aiInteraction.create({
        data: {
          userId: user.id,
          intent: parsed.data.intent,
          redactedContext: context,
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
        },
      });
      throw new ApiError(502, "Não foi possível gerar a sugestão. Tente novamente.");
    }
  } catch (error) {
    return jsonError(error);
  }
}
