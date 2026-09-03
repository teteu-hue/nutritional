"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

const DISCLAIMER =
  "Esta sugestão é apenas informativa e não substitui acompanhamento de nutricionista ou médico. Não constitui prescrição clínica.";

export default function AssistantPage() {
  const [intent, setIntent] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: history } = useQuery({
    queryKey: ["ai-history"],
    queryFn: () => apiFetch<{ items: Array<{ id: string; intent: string; created_at: string; status: string }> }>("/api/v1/ai/history"),
  });

  async function submit() {
    if (!intent.trim()) {
      toast.error("Informe o que você precisa");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ suggestion: string; disclaimer: string }>("/api/v1/ai/diet-suggestions", {
        method: "POST",
        body: JSON.stringify({ intent }),
      });
      setSuggestion(res.suggestion);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar sugestão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Assistente de dieta</h1>
      <Card>
        <CardHeader><CardTitle>O que você precisa?</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder='Ex: "sugerir o que comer no jantar"'
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
          />
          <Button onClick={submit} disabled={loading}>{loading ? "Gerando..." : "Pedir sugestão"}</Button>
        </CardContent>
      </Card>
      {suggestion && (
        <Card>
          <CardHeader><CardTitle>Sugestão</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{suggestion}</p>
            <p className="mt-4 rounded bg-amber-50 p-3 text-xs text-amber-900">{DISCLAIMER}</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {(history?.items ?? []).map((h) => (
              <li key={h.id} className="border-b pb-2">
                <span className="text-gray-500">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                <p>{h.intent}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
