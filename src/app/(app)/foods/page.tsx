"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, ChefHat, Pencil } from "lucide-react";
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
  base_unit: string;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  source: string;
};

export default function FoodsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["foods", search],
    queryFn: () =>
      apiFetch<{ items: Food[] }>(
        `/api/v1/foods?search=${encodeURIComponent(search)}&page=1`,
      ),
  });

  function closeForm() {
    setShowForm(false);
    setEditingFood(null);
  }

  async function saveFood(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const saved = await apiFetch<Food>(
        editingFood ? `/api/v1/foods/${editingFood.id}` : "/api/v1/foods",
        {
          method: editingFood ? "PUT" : "POST",
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
        },
      );
      toast.success(editingFood ? "Alimento atualizado" : "Alimento criado");
      closeForm();
      setSearch(saved.name);
      await queryClient.invalidateQueries({ queryKey: ["foods"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  function startCreate() {
    if (showForm && !editingFood) {
      closeForm();
      return;
    }
    setEditingFood(null);
    setShowForm(true);
  }

  function startEdit(food: Food) {
    setEditingFood(food);
    setShowForm(true);
  }

  const formFood = editingFood;

  const items = data?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catálogo"
        title="Alimentos"
        description="Pesquise no catálogo base ou crie alimentos personalizados."
        action={
          <Button
            onClick={startCreate}
            variant={showForm && !editingFood ? "ghost" : "default"}
          >
            <Plus className="h-4 w-4" />
            {showForm && !editingFood ? "Cancelar" : "Novo alimento"}
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
            <CardTitle>
              {editingFood ? "Editar alimento personalizado" : "Criar alimento personalizado"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form
              key={formFood?.id ?? "create-food"}
              onSubmit={saveFood}
              className="grid gap-3 sm:grid-cols-2"
            >
              <Input name="name" placeholder="Nome" defaultValue={formFood?.name} required />
              <Input
                name="kcal"
                type="number"
                placeholder="Kcal/100g"
                defaultValue={formFood?.kcal}
                required
              />
              <Input
                name="protein_g"
                type="number"
                placeholder="Proteínas"
                defaultValue={formFood?.protein_g}
                required
              />
              <Input
                name="carb_g"
                type="number"
                placeholder="Carboidratos"
                defaultValue={formFood?.carb_g}
                required
              />
              <Input
                name="fat_g"
                type="number"
                placeholder="Gorduras"
                defaultValue={formFood?.fat_g}
                required
              />
              <Input
                name="fiber_g"
                type="number"
                placeholder="Fibras"
                defaultValue={formFood?.fiber_g ?? 0}
                required
              />
              <Input
                name="sodium_mg"
                type="number"
                placeholder="Sódio mg"
                defaultValue={formFood?.sodium_mg ?? 0}
                required
              />
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">
                  {editingFood ? "Salvar alterações" : "Salvar"}
                </Button>
                <Button type="button" variant="ghost" onClick={closeForm}>
                  Cancelar
                </Button>
              </div>
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
          {!isLoading && items.length === 0 && (
            <li className="px-5 py-8 text-center">
              <ChefHat className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                {search ? "Nenhum resultado" : "Nenhum alimento encontrado"}
              </p>
            </li>
          )}
          {items.map((food) => (
            <li
              key={food.id}
              className="flex flex-col items-start justify-between gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{food.name}</span>
                {food.source === "user" && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-strong">
                    personalizado
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-slate-500">
                <span>
                  {food.kcal} kcal · {food.protein_g}g prot
                </span>
                {food.source === "user" && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(food)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
