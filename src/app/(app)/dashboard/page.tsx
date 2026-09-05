"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flame, Beef, Wheat, Droplets, CalendarClock, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type DailyDashboard = {
  date: string;
  consumed: { kcal: number; protein_g: number; carb_g: number; fat_g: number };
  targets: { kcal: number; protein_g: number; carb_g: number; fat_g: number } | null;
  meals_count: number;
};

function pct(consumed: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((consumed / target) * 100));
}

type StatCardConfig = {
  key: "kcal" | "protein_g" | "carb_g" | "fat_g";
  title: string;
  unit: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const STATS: StatCardConfig[] = [
  { key: "kcal", title: "Calorias", unit: "kcal", Icon: Flame, accent: "text-orange-500 bg-orange-50" },
  { key: "protein_g", title: "Proteínas", unit: "g", Icon: Beef, accent: "text-rose-500 bg-rose-50" },
  { key: "carb_g", title: "Carboidratos", unit: "g", Icon: Wheat, accent: "text-amber-600 bg-amber-50" },
  { key: "fat_g", title: "Gorduras", unit: "g", Icon: Droplets, accent: "text-sky-600 bg-sky-50" },
];

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mb-3 h-7 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const humanDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-daily", today],
    queryFn: () => apiFetch<DailyDashboard>(`/api/v1/dashboard/daily?date=${today}`),
  });

  const targets = data?.targets;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resumo diário"
        title="Seu dia em números"
        description={<span className="capitalize">{humanDate}</span>}
      />

      {!isLoading && !targets && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Complete seu perfil no <span className="font-semibold">onboarding</span> para
          visualizar suas metas nutricionais.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? STATS.map((s) => <SkeletonCard key={s.key} />)
          : STATS.map(({ key, title, unit, Icon, accent }) => {
              const consumed = data?.consumed[key] ?? 0;
              const target = targets?.[key];
              const percentage = target ? pct(consumed, target) : 0;
              return (
                <Card key={key} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", accent)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        {title}
                      </div>
                      {target && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {percentage}%
                        </span>
                      )}
                    </div>
                    <p className="mb-3 font-display text-2xl font-semibold text-slate-900">
                      {consumed}
                      <span className="ml-1 text-sm font-normal text-slate-500">
                        / {target ?? "—"} {unit}
                      </span>
                    </p>
                    {target ? (
                      <Progress value={percentage} />
                    ) : (
                      <p className="text-xs text-slate-400">Sem meta definida</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
              <UtensilsCrossed className="h-4 w-4" />
            </span>
            <CardTitle>Progresso do dia</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-slate-600">
              Você já registrou{" "}
              <span className="font-semibold text-slate-900">
                {data?.meals_count ?? 0} refeições
              </span>{" "}
              hoje. Continue registrando para acompanhar suas metas com precisão.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <CalendarClock className="h-4 w-4" />
            </span>
            <CardTitle>Dica</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-slate-600">
            Distribua as proteínas ao longo do dia para melhor absorção.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
