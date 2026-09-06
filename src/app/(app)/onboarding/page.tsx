"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

const ACTIVITY_OPTIONS = [
  { value: "sedentario", label: "Sedentário" },
  { value: "leve", label: "Leve" },
  { value: "moderado", label: "Moderado" },
  { value: "ativo", label: "Ativo" },
  { value: "muito_ativo", label: "Muito ativo" },
];

const GOAL_OPTIONS = [
  { value: "perder_peso", label: "Perder peso" },
  { value: "manter_peso", label: "Manter peso" },
  { value: "ganhar_peso", label: "Ganhar peso" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date_of_birth: "",
    biological_sex: "male",
    height_cm: "",
    weight_kg: "",
    body_fat_percent: "",
    activity_level: "moderado",
    goal: "manter_peso",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/v1/onboarding", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          height_cm: Number(form.height_cm),
          weight_kg: Number(form.weight_kg),
          body_fat_percent: form.body_fat_percent ? Number(form.body_fat_percent) : null,
        }),
        skipRedirect: true,
      });
      toast.success("Perfil salvo!");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar perfil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="overflow-hidden">
        <div className="brand-gradient px-6 py-8 sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-strong">
            Onboarding
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Bem-vindo! Complete seu perfil
          </h1>
          <p className="mt-2 max-w-lg text-sm text-slate-600 sm:text-base">
            Precisamos desses dados para calcular suas metas nutricionais personalizadas.
          </p>
        </div>

        <CardContent className="px-6 pt-6 sm:px-10">
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              Data de nascimento
              <Input
                type="date"
                required
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              Sexo biológico
              <SelectNative
                value={form.biological_sex}
                onChange={(e) => setForm({ ...form, biological_sex: e.target.value })}
              >
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </SelectNative>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              Altura (cm)
              <Input
                type="number"
                required
                min={1}
                placeholder="Ex.: 175"
                value={form.height_cm}
                onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              Peso atual (kg)
              <Input
                type="number"
                required
                min={20}
                max={400}
                step="0.1"
                placeholder="Ex.: 72,5"
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              % Gordura corporal (opcional)
              <Input
                type="number"
                min={3}
                max={75}
                step="0.1"
                placeholder="Ex.: 18.5"
                value={form.body_fat_percent}
                onChange={(e) => setForm({ ...form, body_fat_percent: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              Nível de atividade
              <SelectNative
                value={form.activity_level}
                onChange={(e) => setForm({ ...form, activity_level: e.target.value })}
              >
                {ACTIVITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectNative>
            </label>
            <label className="space-y-1 text-sm text-slate-700 sm:col-span-2">
              Objetivo
              <SelectNative
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
              >
                {GOAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectNative>
            </label>
            <div className="mt-2 flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Seus dados são usados apenas para calcular suas metas.
              </p>
              <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto">
                {loading ? "Salvando..." : "Concluir onboarding"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
