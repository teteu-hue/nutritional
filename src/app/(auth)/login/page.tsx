"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipRedirect: true,
      });
      const profile = await apiFetch<{ complete: boolean }>("/api/v1/profile", {
        skipRedirect: true,
      });
      router.replace(profile.complete ? "/dashboard" : "/onboarding");
    } catch {
      toast.error("Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
          Bem-vindo de volta
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Entre para continuar acompanhando sua nutrição.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          E-mail
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="pl-11"
            />
          </div>
        </label>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          Senha
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pl-11"
            />
          </div>
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Novo por aqui?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
