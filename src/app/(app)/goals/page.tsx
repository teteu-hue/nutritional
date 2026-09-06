"use client";

import { useQuery } from "@tanstack/react-query";
import { Flame, Beef, Wheat, Droplets, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/helper/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Goals = {
  origin: "auto" | "manual";
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

const METRICS: Array<{
  key: keyof Omit<Goals, "origin">;
  label: string;
  unit: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
}> = [
  { key: "kcal", label: "Calorias", unit: "kcal", Icon: Flame, accent: "text-orange-500 bg-orange-50" },
  { key: "protein_g", label: "Proteínas", unit: "g", Icon: Beef, accent: "text-rose-500 bg-rose-50" },
  { key: "carb_g", label: "Carboidratos", unit: "g", Icon: Wheat, accent: "text-amber-600 bg-amber-50" },
  { key: "fat_g", label: "Gorduras", unit: "g", Icon: Droplets, accent: "text-sky-600 bg-sky-50" },
];

export default function GoalsPage() {
  const { data, refetch } = useQuery({
    queryKey: ["goals"],
    queryFn: () => apiFetch<Goals>("/api/v1/goals"),
  });

  async function clearOverride() {
    await apiFetch("/api/v1/goals/override", { method: "DELETE" });
    toast.success("Override removido");
    refetch();
  }

  async function setOverride(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await apiFetch("/api/v1/goals/override", {
        method: "PUT",
        body: JSON.stringify({
          kcal: Number(fd.get("kcal")),
          protein_g: Number(fd.get("protein_g")),
          carb_g: Number(fd.get("carb_g")),
          fat_g: Number(fd.get("fat_g")),
        }),
      });
      toast.success("Override aplicado");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Override inválido");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Metas"
        title="Metas diárias"
        description="Suas metas nutricionais podem ser calculadas automaticamente ou ajustadas manualmente."
      />

      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Metas ativas</CardTitle>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  data.origin === "auto"
                    ? "bg-brand-soft text-brand-strong"
                    : "bg-amber-50 text-amber-700",
                )}
              >
                {data.origin === "auto" ? "automático" : "manual"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {METRICS.map(({ key, label, unit, Icon, accent }) => (
                <div
                  key={key}
                  className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4"
                >
                  <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", accent)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {label}
                  </div>
                  <p className="font-display text-xl font-semibold text-slate-900">
                    {data[key]}
                    <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <CardTitle>Override manual</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="mb-4 text-sm text-slate-500">
            Prefere definir suas próprias metas? Preencha os campos abaixo e aplique o
            override. Você pode voltar às metas automáticas a qualquer momento.
          </p>
          <form onSubmit={setOverride} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-600">
              Calorias
              <Input name="kcal" type="number" placeholder="Ex.: 2200" required />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Proteínas (g)
              <Input name="protein_g" type="number" placeholder="Ex.: 140" required />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Carboidratos (g)
              <Input name="carb_g" type="number" placeholder="Ex.: 250" required />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Gorduras (g)
              <Input name="fat_g" type="number" placeholder="Ex.: 70" required />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit">Aplicar override</Button>
              <Button type="button" variant="outline" onClick={clearOverride}>
                <RotateCcw className="h-4 w-4" />
                Limpar override
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
