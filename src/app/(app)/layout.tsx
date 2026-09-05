import { AppHeader } from "@/components/app/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
          <div className="animate-fade-in">{children}</div>
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white/60 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-slate-500 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Nutritional</span>
          <span>Feito com carinho para acompanhar sua nutrição.</span>
        </div>
      </footer>
    </div>
  );
}
