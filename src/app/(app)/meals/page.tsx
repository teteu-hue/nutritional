"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

type Meal = {
  id: string;
  meal_type: string;
  totals: { kcal: number; protein_g: number };
  items: Array<{ food_name: string; portion_amount: number }>;
};

export default function MealsPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [foodId, setFoodId] = useState("");
  const [portion, setPortion] = useState("100");

  const { data, refetch } = useQuery({
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
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Refeições</h1>
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />
      <Card>
        <CardHeader><CardTitle>Registrar refeição rápida</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input placeholder="ID do alimento" value={foodId} onChange={(e) => setFoodId(e.target.value)} className="max-w-xs" />
          <Input type="number" placeholder="Porção (g)" value={portion} onChange={(e) => setPortion(e.target.value)} className="max-w-[120px]" />
          <Button onClick={addMeal}>Adicionar</Button>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {(data?.items ?? []).map((meal) => (
          <Card key={meal.id}>
            <CardContent className="pt-4">
              <p className="font-medium capitalize">{meal.meal_type.replace(/_/g, " ")}</p>
              <p className="text-sm text-gray-600">{meal.totals.kcal} kcal · {meal.totals.protein_g}g proteína</p>
              <ul className="mt-2 text-sm text-gray-500">
                {meal.items.map((item, i) => (
                  <li key={i}>{item.food_name} — {item.portion_amount}g</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
