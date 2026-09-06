"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Coffee, Utensils, Moon, Cookie, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

type Meal = {
  id: string;
  meal_type: string;
  totals: { kcal: number; protein_g: number };
  items: Array<{ food_name: string; portion_amount: number }>;
};

const MEAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cafe: Coffee,
  cafe_da_manha: Coffee,
  almoco: Utensils,
  jantar: Moon,
  lanche: Cookie,
};

function MealIcon({ type }: { type: string }) {
  const Icon = MEAL_ICONS[type] ?? Utensils;
  return <Icon className="h-4 w-4" />;
}

export default function MealsPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [foodId, setFoodId] = useState("");
  const [portion, setPortion] = useState("100");

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["meals", date],
    queryFn: () => apiFetch<{ items: Meal[] }>(`/api/v1/meals?date=${date}`),
  });

  async function addMeal() {
    if (!foodId) {
      toast.error("Informe o ID do alimento");
      return;
    }
    try {
      await apiFetch("/api/v1/meals", {
        method: "POST",
        body: JSON.stringify({
          meal_date: date,
          meal_type: "almoco",
          items: [{ food_id: foodId, portion_amount: Number(portion), portion_unit: "g100" }],
        }),
      });
      toast.success("Refeição registrada");
      setFoodId("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  const meals = data?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Refeições"
        title="Seu diário alimentar"
        description="Registre suas refeições ao longo do dia para acompanhar suas metas."
      />

      <Card>
        <CardHeader>
          <CardTitle>Selecionar data</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar refeição rápida</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
            <Input
              placeholder="ID do alimento"
              value={foodId}
              onChange={(e) => setFoodId(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Porção (g)"
              value={portion}
              onChange={(e) => setPortion(e.target.value)}
            />
            <Button onClick={addMeal} className="sm:justify-self-start">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Refeições registradas
        </h2>

        {isLoading && (
          <Card>
            <CardContent className="p-6 text-sm text-slate-500">Carregando...</CardContent>
          </Card>
        )}

        {!isLoading && meals.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <ClipboardList className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                Nenhuma refeição registrada nesta data.
              </p>
            </CardContent>
          </Card>
        )}

        {meals.map((meal) => (
          <Card key={meal.id}>
            <CardContent className="p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                    <MealIcon type={meal.meal_type} />
                  </span>
                  <p className="font-medium capitalize text-slate-900">
                    {meal.meal_type.replace(/_/g, " ")}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {meal.totals.kcal} kcal
                  <span className="ml-1 font-normal text-slate-500">
                    · {meal.totals.protein_g}g prot
                  </span>
                </p>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-500">
                {meal.items.map((item, i) => (
                  <li key={i}>
                    {item.food_name} — {item.portion_amount}g
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
