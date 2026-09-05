"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Send, History, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

const DISCLAIMER =
  "Esta sugestão é apenas informativa e não substitui acompanhamento de nutricionista ou médico. Não constitui prescrição clínica.";

const SUGGESTIONS = [
  "sugerir o que comer no jantar",
  "montar um café da manhã proteico",
  "opções de lanche saudável",
];

export default function AssistantPage() {
  const [intent, setIntent] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: history } = useQuery({
    queryKey: ["ai-history"],
    queryFn: () =>
      apiFetch<{
        items: Array<{ id: string; intent: string; created_at: string; status: string }>;
      }>("/api/v1/ai/history"),
  });

  async function submit() {
    if (!intent.trim()) {
      toast.error("Informe o que você precisa");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ suggestion: string; disclaimer: string }>(
        "/api/v1/ai/diet-suggestions",
        {
          method: "POST",
          body: JSON.stringify({ intent }),
        },
      );
      setSuggestion(res.suggestion);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar sugestão");
    } finally {
      setLoading(false);
    }
  }

  const items = history?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Assistente"
        title="Sugestões de dieta com IA"
        description="Peça sugestões personalizadas com base em suas metas e preferências."
      />

      <Card className="overflow-hidden">
        <div className="brand-gradient p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-strong shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Como posso ajudar?
              </h2>
              <p className="text-sm text-slate-600">
                Descreva o que você precisa em uma frase curta.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder='Ex.: "sugerir o que comer no jantar"'
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) submit();
              }}
              className="flex-1"
            />
            <Button onClick={submit} disabled={loading}>
              <Send className="h-4 w-4" />
              {loading ? "Gerando..." : "Pedir sugestão"}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setIntent(s)}
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-brand hover:text-brand-strong"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {suggestion && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Sugestão</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {suggestion}
            </p>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{DISCLAIMER}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <History className="h-4 w-4" />
          </span>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">
              Suas solicitações anteriores aparecerão aqui.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {items.map((h) => (
                <li
                  key={h.id}
                  className="rounded-xl border border-slate-200/70 bg-slate-50/40 px-4 py-3"
                >
                  <span className="text-xs text-slate-500">
                    {new Date(h.created_at).toLocaleString("pt-BR")}
                  </span>
                  <p className="mt-0.5 text-slate-800">{h.intent}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
