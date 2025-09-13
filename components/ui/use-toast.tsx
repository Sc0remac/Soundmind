"use client";
import * as React from "react";

type Toast = { id: string; title?: string; description?: string };

type Ctx = {
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastCtx = React.createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((x) => [...x, { id, ...t }]);
    // auto-dismiss after 3s
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3000);
  }, []);
  const dismiss = React.useCallback((id: string) => setToasts((x) => x.filter((y) => y.id !== id)), []);
  return <ToastCtx.Provider value={{ toasts, toast, dismiss }}>{children}</ToastCtx.Provider>;
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div role="status" aria-live="polite" className="fixed bottom-3 right-3 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-md bg-white text-black shadow px-3 py-2 text-sm">
          {t.title ? <div className="font-medium">{t.title}</div> : null}
          {t.description ? <div className="text-xs opacity-80">{t.description}</div> : null}
          <button className="mt-1 text-xs underline" onClick={() => dismiss(t.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  );
}

