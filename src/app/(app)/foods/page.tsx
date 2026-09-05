"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, ChefHat } from "lucide-react";
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

type Food = {
  id: string;
  name: string;
  kcal: number;
  protein_g: number;
  source: string;
};

export default function FoodsPage() {
  const [search, setSearch] = useState("arroz");
  const [showForm, setShowForm] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["foods", search],
    queryFn: () =>
      apiFetch<{ items: Food[] }>(
        `/api/v1/foods?search=${encodeURIComponent(search)}&page=1`,
      ),
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

  const items = data?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catálogo"
        title="Alimentos"
        description="Pesquise no catálogo base ou crie alimentos personalizados."
        action={
          <Button
            onClick={() => setShowForm((v) => !v)}
            variant={showForm ? "ghost" : "default"}
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Cancelar" : "Novo alimento"}
          </Button>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar alimento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11"
        />
      </div>

      {showForm && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Criar alimento personalizado</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={createFood} className="grid gap-3 sm:grid-cols-2">
              <Input name="name" placeholder="Nome" required />
              <Input name="kcal" type="number" placeholder="Kcal/100g" required />
              <Input name="protein_g" type="number" placeholder="Proteínas" required />
              <Input name="carb_g" type="number" placeholder="Carboidratos" required />
              <Input name="fat_g" type="number" placeholder="Gorduras" required />
              <Input
                name="fiber_g"
                type="number"
                placeholder="Fibras"
                defaultValue={0}
                required
              />
              <Input
                name="sodium_mg"
                type="number"
                placeholder="Sódio mg"
                defaultValue={0}
                required
              />
              <Button type="submit" className="sm:col-span-2">
                Salvar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {isLoading && (
            <li className="px-5 py-6 text-center text-sm text-slate-500">
              Buscando...
            </li>
          )}
          {!isLoading && items.length === 0 && search.length >= 2 && (
            <li className="px-5 py-8 text-center">
              <ChefHat className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">Nenhum resultado</p>
            </li>
          )}
          {items.map((food) => (
            <li
              key={food.id}
              className="flex flex-col items-start justify-between gap-1 px-5 py-4 text-sm sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{food.name}</span>
                {food.source === "user" && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-strong">
                    personalizado
                  </span>
                )}
              </div>
              <span className="text-slate-500">
                {food.kcal} kcal · {food.protein_g}g prot
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
