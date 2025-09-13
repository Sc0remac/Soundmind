import * as React from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "emerald"
  | "sky"
  | "slate"
  | "rose"
  | "amber";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneMap: Record<Tone, string> = {
  emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-300/30",
  sky: "bg-sky-500/15 text-sky-300 ring-sky-300/30",
  slate: "bg-slate-500/15 text-slate-300 ring-slate-300/30",
  rose: "bg-rose-500/15 text-rose-300 ring-rose-300/30",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-300/30",
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1",
        toneMap[tone],
        className
      )}
      {...props}
    />
  );
}

export default Badge;

