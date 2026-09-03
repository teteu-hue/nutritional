"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      await apiFetch("/api/v1/profile", {
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
    <Card>
      <CardHeader>
        <CardTitle>Bem-vindo! Complete seu perfil</CardTitle>
        <p className="text-sm text-gray-600">
          Precisamos desses dados para calcular suas metas nutricionais.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Data de nascimento
            <Input type="date" required value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            Sexo biológico
            <select className="flex h-10 w-full rounded-md border border-gray-300 px-3" value={form.biological_sex} onChange={(e) => setForm({ ...form, biological_sex: e.target.value })}>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Altura (cm)
            <Input type="number" required min={1} value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            Peso atual (kg)
            <Input type="number" required min={20} max={400} step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            % Gordura corporal (opcional)
            <Input type="number" min={3} max={75} step="0.1" placeholder="Ex: 18.5" value={form.body_fat_percent} onChange={(e) => setForm({ ...form, body_fat_percent: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            Nível de atividade
            <select className="flex h-10 w-full rounded-md border border-gray-300 px-3" value={form.activity_level} onChange={(e) => setForm({ ...form, activity_level: e.target.value })}>
              {ACTIVITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            Objetivo
            <select className="flex h-10 w-full rounded-md border border-gray-300 px-3" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
              {GOAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Salvando..." : "Concluir onboarding"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
