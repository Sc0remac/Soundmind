// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Link from "next/link";
import Image from "next/image";
import HeaderNav from "@/components/HeaderNav";

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
                <Image
                  src="/brand/logo-final.png"
                  alt="Soundmind"
                  width={36}
                  height={36}
                  className="rounded-xl shadow-card"
                  priority
                />
                <span className="text-lg font-semibold tracking-tight group-hover:text-indigo-300 transition-colors">
                  Soundmind
                </span>
              </Link>
              <HeaderNav />
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
