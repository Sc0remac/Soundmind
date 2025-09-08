// components/ui/IconBadge.tsx
"use client";
import { cn } from "@/lib/utils"; // If you don't have a cn helper, replace with simple join

export default function IconBadge({
  icon: Icon,
  label,
  className,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-xl bg-white/7 px-3 py-2 ring-1 ring-white/10", className)}>
      <Icon className="size-4" />
      {label && <span className="text-sm text-white/90">{label}</span>}
    </div>
  );
}