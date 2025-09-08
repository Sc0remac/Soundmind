import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Link from "next/link";
import {
  Activity,
  Laugh,
  LineChart,
  Music,
  PlusCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Soundmind",
  description: "Train smarter with music, mood, and workout insights.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  );
}

/* ---------------- Shell ---------------- */

function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-content1/60 backdrop-blur">
        <div className="h-16 flex items-center px-4 gap-3">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              SM
            </span>
            <span className="tracking-tight">Soundmind</span>
          </Link>
        </div>
        <nav className="px-2 py-4 space-y-1">
          <NavItem href="/insights" icon={<LineChart size={16} />} label="Insights" />
          <NavItem href="/workout/new" icon={<PlusCircle size={16} />} label="Log workout" />
          <NavItem href="/mood/new" icon={<Laugh size={16} />} label="Log mood" />
          <NavItem href="/timeline" icon={<Activity size={16} />} label="Timeline" />
          <NavItem href="/music" icon={<Music size={16} />} label="Music" />
        </nav>
        <div className="mt-auto p-4 text-xs text-foreground/50">
          <div>Train smart. Be kind to future you.</div>
        </div>
      </aside>

      {/* Main column */}
      <main className="flex-1">
        {/* Top bar (mobile & desktop) */}
        <header className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="md:hidden font-semibold">
              Soundmind
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <TopLink href="/insights" label="Insights" />
              <TopLink href="/music" label="Music" />
              <TopLink href="/timeline" label="Timeline" />
            </div>
            <div className="flex items-center gap-2">
              <TopLink href="/api/spotify/start" label="Connect Spotify" />
            </div>
          </div>
        </header>

        {/* Page container */}
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground/80 hover:bg-content2 hover:text-foreground transition"
    >
      <span className="text-foreground/60">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function TopLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm text-foreground/70 hover:text-foreground transition"
    >
      {label}
    </Link>
  );
}
