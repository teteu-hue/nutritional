import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm transition-colors",
      "placeholder:text-slate-400",
      "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
      "disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
