// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Soundmind",
  description: "Track workouts, moods, and music — and see the patterns.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 text-slate-100 selection:bg-indigo-500/40">
        <Providers>
          <div className="mx-auto max-w-6xl px-4 py-4">
            <header className="mb-6 flex items-center justify-between">
              <Link href="/" className="group inline-flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 shadow-card" />
                <span className="text-lg font-semibold tracking-tight group-hover:text-indigo-300 transition-colors">
                  Soundmind
                </span>
              </Link>
              <nav className="flex items-center gap-2 text-sm">
  <Link href="/workout/new" className="rounded-xl px-3 py-2 hover:bg-white/5">Log workout</Link>
  <Link href="/mood/new" className="rounded-xl px-3 py-2 hover:bg-white/5">Log mood</Link>
  <Link href="/timeline" className="rounded-xl px-3 py-2 hover:bg-white/5">Timeline</Link>
  <Link href="/music" className="rounded-xl px-3 py-2 hover:bg-white/5">Music</Link>
  <Link href="/insights" className="rounded-xl px-3 py-2 hover:bg-white/5">Insights</Link>
  <Link href="/profile" className="rounded-xl px-3 py-2 hover:bg-white/5">Profile</Link>
</nav>
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}