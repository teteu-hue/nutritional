export const AI_DISCLAIMER =
  "Esta sugestão é apenas informativa e não substitui acompanhamento de nutricionista ou médico. Não constitui prescrição clínica.";

export type AIDietProviderRequest = {
  intent: string;
  context: Record<string, unknown>;
};

export type AIDietProviderResponse = {
  suggestion: string;
  tokensPrompt?: number;
  tokensCompletion?: number;
};

export interface AIDietProvider {
  generateSuggestion(request: AIDietProviderRequest): Promise<AIDietProviderResponse>;
}
