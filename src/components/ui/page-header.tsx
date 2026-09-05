import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  className,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl space-y-1">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-strong">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 sm:text-base">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
