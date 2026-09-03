"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

type Food = { id: string; name: string; kcal: number; protein_g: number; source: string };

export default function FoodsPage() {
  const [search, setSearch] = useState("arroz");
  const [showForm, setShowForm] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["foods", search],
    queryFn: () => apiFetch<{ items: Food[] }>(`/api/v1/foods?search=${encodeURIComponent(search)}&page=1`),
    enabled: search.length >= 2,
  });

  async function createFood(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await apiFetch("/api/v1/foods", {
        method: "POST",
        body: JSON.stringify({
          name: fd.get("name"),
          base_unit: "g100",
          kcal: Number(fd.get("kcal")),
          protein_g: Number(fd.get("protein_g")),
          carb_g: Number(fd.get("carb_g")),
          fat_g: Number(fd.get("fat_g")),
          fiber_g: Number(fd.get("fiber_g")),
          sodium_mg: Number(fd.get("sodium_mg")),
        }),
      });
      toast.success("Alimento criado");
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alimentos</h1>
        <Button onClick={() => setShowForm(!showForm)} variant="outline">Novo personalizado</Button>
      </div>
      <Input placeholder="Buscar alimento..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Criar alimento</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createFood} className="grid gap-2 sm:grid-cols-2">
              <Input name="name" placeholder="Nome" required />
              <Input name="kcal" type="number" placeholder="Kcal/100g" required />
              <Input name="protein_g" type="number" placeholder="Proteínas" required />
              <Input name="carb_g" type="number" placeholder="Carboidratos" required />
              <Input name="fat_g" type="number" placeholder="Gorduras" required />
              <Input name="fiber_g" type="number" placeholder="Fibras" defaultValue={0} required />
              <Input name="sodium_mg" type="number" placeholder="Sódio mg" defaultValue={0} required />
              <Button type="submit" className="sm:col-span-2">Salvar</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <ul className="divide-y rounded-lg border bg-white">
        {(data?.items ?? []).map((food) => (
          <li key={food.id} className="flex justify-between px-4 py-3 text-sm">
            <span>{food.name} {food.source === "user" && <span className="text-emerald-600">(personalizado)</span>}</span>
            <span className="text-gray-500">{food.kcal} kcal · {food.protein_g}g prot</span>
          </li>
        ))}
        {data?.items.length === 0 && search.length >= 2 && (
          <li className="px-4 py-6 text-center text-gray-500">Nenhum resultado</li>
        )}
      </ul>
    </div>
  );
}
