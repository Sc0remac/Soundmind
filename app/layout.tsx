// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import SupabaseListener from "@/components/SupabaseListener";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Soundmind",
  description: "Track workouts, moods, and music — and see the patterns.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 text-slate-100 selection:bg-indigo-500/40">
        {/* Providers wraps the app (theme, etc.) */}
        <Providers>
          {/* SupabaseListener keeps the browser/session in sync with cookies,
              and refreshes server components on auth changes. */}
          <SupabaseListener />

          <div className="mx-auto max-w-6xl px-4 py-4">
            <NavBar />

            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
