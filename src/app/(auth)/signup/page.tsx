"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/helper/api-client";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch<{
        userId: string;
        redirectTo?: string;
        autoSignedIn?: boolean;
      }>("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, acceptTerms }),
        skipRedirect: true,
      });
      if (response.autoSignedIn === false) {
        toast.info("Conta criada. Faça login para continuar.");
      }
      router.replace(response.redirectTo ?? "/onboarding");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no cadastro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
          Criar sua conta
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Comece a acompanhar sua nutrição em minutos.
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
              placeholder="mín. 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="pl-11"
            />
          </div>
          <p className="text-xs font-normal text-slate-500">
            Use pelo menos 8 caracteres com letras e números.
          </p>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-emerald-500"
          />
          <span>
            Aceito os termos de uso e o processamento de dados por IA externa.
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || !acceptTerms}
        >
          {loading ? "Cadastrando..." : "Criar conta"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
