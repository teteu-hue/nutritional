import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-lg font-semibold text-emerald-700">
            Nutritional
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="hover:text-emerald-700">Dashboard</Link>
            <Link href="/meals" className="hover:text-emerald-700">Refeições</Link>
            <Link href="/foods" className="hover:text-emerald-700">Alimentos</Link>
            <Link href="/goals" className="hover:text-emerald-700">Metas</Link>
            <Link href="/assistant" className="hover:text-emerald-700">Assistente</Link>
            <Link href="/onboarding" className="hover:text-emerald-700">Perfil</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
