"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api-client";

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

export default function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-daily", today],
    queryFn: () => apiFetch<DailyDashboard>(`/api/v1/dashboard/daily?date=${today}`),
  });

  if (isLoading) return <p>Carregando...</p>;

  const targets = data?.targets;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard — {today}</h1>
      {!targets && (
        <p className="text-amber-700">Complete seu perfil para ver metas.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Calorias</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-semibold">{data?.consumed.kcal ?? 0} / {targets?.kcal ?? "—"} kcal</p>
            {targets && <Progress value={pct(data?.consumed.kcal ?? 0, targets.kcal)} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Proteínas</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-2">{data?.consumed.protein_g ?? 0}g / {targets?.protein_g ?? "—"}g</p>
            {targets && <Progress value={pct(data?.consumed.protein_g ?? 0, targets.protein_g)} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Carboidratos</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-2">{data?.consumed.carb_g ?? 0}g / {targets?.carb_g ?? "—"}g</p>
            {targets && <Progress value={pct(data?.consumed.carb_g ?? 0, targets.carb_g)} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Gorduras</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-2">{data?.consumed.fat_g ?? 0}g / {targets?.fat_g ?? "—"}g</p>
            {targets && <Progress value={pct(data?.consumed.fat_g ?? 0, targets.fat_g)} />}
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-gray-600">Refeições registradas hoje: {data?.meals_count ?? 0}</p>
    </div>
  );
}
