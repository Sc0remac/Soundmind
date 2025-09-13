"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  children?: React.ReactNode;
}

export function Sheet({ open, onOpenChange, title, children }: SheetProps) {
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "sheet-title" : undefined}
      className="fixed inset-0 z-50"
    >
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60"
        onClick={(e) => {
          if (e.target === overlayRef.current) onOpenChange(false);
        }}
      />
      <div className={cn("absolute inset-y-0 right-0 w-full max-w-md bg-neutral-900/95 border-l border-white/10 backdrop-blur p-4 overflow-y-auto")}
      >
        {title ? (
          <div className="mb-2 flex items-center justify-between">
            <h2 id="sheet-title" className="text-sm font-medium">{title}</h2>
            <button
              className="rounded p-1 text-white/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export default Sheet;

