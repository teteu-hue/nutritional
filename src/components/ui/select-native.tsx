import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const SelectNative = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 py-2 text-sm text-slate-900 shadow-sm transition-colors",
        "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
  </div>
));
SelectNative.displayName = "SelectNative";
