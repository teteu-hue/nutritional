import Link from "next/link";
import { Leaf, Sparkles, Target, ClipboardList } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden lg:block">
        <div className="brand-gradient absolute inset-0" aria-hidden="true" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="flex items-center gap-2 text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-sm">
              <Leaf className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Nutritional
            </span>
          </Link>

          <div className="max-w-md">
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-slate-900 xl:text-4xl">
              Sua nutrição, acompanhada com clareza.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Registre refeições, acompanhe metas e receba sugestões personalizadas
              — tudo em um só lugar, com uma interface simples e amigável.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-strong shadow-sm">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-900">Diário alimentar</span> — registre suas
                  refeições em segundos.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-strong shadow-sm">
                  <Target className="h-4 w-4" />
                </span>
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-900">Metas inteligentes</span> — calculadas com
                  base no seu perfil e ajustáveis manualmente.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-strong shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </span>
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-900">Assistente com IA</span> — sugestões de
                  refeições sob demanda.
                </p>
              </li>
            </ul>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Nutritional · Acompanhamento nutricional
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10 sm:px-6 lg:py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2 text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-sm">
                <Leaf className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">
                Nutritional
              </span>
            </Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
