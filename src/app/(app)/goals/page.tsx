"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

type Goals = {
  origin: "auto" | "manual";
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Metas diárias</h1>
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>
              Metas ativas
              <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs font-normal">
                {data.origin === "auto" ? "automático" : "manual"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <p>{data.kcal} kcal</p>
            <p>{data.protein_g}g proteínas</p>
            <p>{data.carb_g}g carboidratos</p>
            <p>{data.fat_g}g gorduras</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Override manual</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={setOverride} className="grid gap-2 sm:grid-cols-2">
            <Input name="kcal" type="number" placeholder="Kcal" required />
            <Input name="protein_g" type="number" placeholder="Proteínas (g)" required />
            <Input name="carb_g" type="number" placeholder="Carboidratos (g)" required />
            <Input name="fat_g" type="number" placeholder="Gorduras (g)" required />
            <Button type="submit">Aplicar override</Button>
            <Button type="button" variant="outline" onClick={clearOverride}>Limpar override</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
