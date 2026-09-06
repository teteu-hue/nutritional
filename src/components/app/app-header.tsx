"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Utensils,
  Apple,
  Target,
  Sparkles,
  User,
  LogOut,
  Menu,
  X,
  Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/helper/api-client";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Refeições", href: "/meals", icon: Utensils },
  { label: "Alimentos", href: "/foods", icon: Apple },
  { label: "Metas", href: "/goals", icon: Target },
  { label: "Assistente", href: "/assistant", icon: Sparkles },
  { label: "Perfil", href: "/onboarding", icon: User },
];

function useLockBodyScroll(locked: boolean) {
  React.useEffect(() => {
    if (!locked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}

function NavLink({
  item,
  active,
  onClick,
  variant = "desktop",
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
  variant?: "desktop" | "mobile";
}) {
  const Icon = item.icon;
  if (variant === "mobile") {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
          active
            ? "bg-brand-soft text-brand-strong"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            active ? "text-brand-strong" : "text-slate-500 group-hover:text-slate-700",
          )}
        />
        {item.label}
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "text-brand-strong"
          : "text-slate-600 hover:text-slate-900",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
      {active && (
        <span className="pointer-events-none absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-brand" />
      )}
    </Link>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  useLockBodyScroll(open);

  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (open) setOpen(false);
  }

  React.useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = React.useCallback(
    (href: string) => pathname === href || pathname?.startsWith(`${href}/`) === true,
    [pathname],
  );

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST", skipRedirect: true });
    } catch {
      /* ignore */
    } finally {
      setSigningOut(false);
      router.replace("/login");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="group flex items-center gap-2 rounded-full py-1 pr-3 text-slate-900"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-sm ring-1 ring-inset ring-white/30 transition-transform group-hover:scale-105">
            <Leaf className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Nutritional
          </span>
        </Link>

        <nav aria-label="Navegação principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item.href)} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="hidden lg:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>

          <button
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        className={cn(
          "lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "fixed inset-0 top-16 z-30 bg-slate-900/40 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
          className={cn(
            "fixed inset-x-0 top-16 z-40 origin-top border-b border-slate-200 bg-white shadow-lg transition-all duration-200 ease-out",
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0",
          )}
        >
          <nav aria-label="Navegação móvel" className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={isActive(item.href)}
                    onClick={() => setOpen(false)}
                    variant="mobile"
                  />
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleSignOut();
                }}
                disabled={signingOut}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
