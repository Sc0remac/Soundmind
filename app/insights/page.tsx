"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Sheet from "@/components/ui/sheet";
import { ToastProvider, Toaster, useToast } from "@/components/ui/use-toast";
import { Music2, CalendarDays } from "lucide-react";

type Effect = "Big boost" | "Helps" | "Neutral" | "Drains";
type Reliability = "Consistent" | "Often" | "Early hint";

type SummaryAction = { id: string; label: string; primary?: boolean; href?: string; target?: string };
type FaceliftData = {
  sample: number;
  states: { newUser: boolean; lowData: boolean; conflicting: boolean; stale: boolean; musicConnected: boolean };
  weeklySummary: { line1: string; line2: string; actions: SummaryAction[]; evidence: string[] };
  chips: { boosters: ChipItem[]; drainers: ChipItem[] };
  best: { slots: string[]; pairings: { id: string; label: string; effect: Effect; cta: string }[] };
  plan: { id: string; title: string; why: string; actions: string[] }[];
  wins: string[];
  tip: string;
};

type ChipItem = {
  id: string;
  kind: "music" | "workout" | "time" | "drainer";
  label: string;
  effect: Effect;
  reliability: Reliability;
  primary: string; // Play / Add to plan / Schedule / Adjust
  evidence?: string[];
  recommendation?: string;
};

function toneToBadge(effect: Effect): { tone: string; text: string } {
  switch (effect) {
    case "Big boost":
      return { tone: "emerald", text: "Big boost" };
    case "Helps":
      return { tone: "sky", text: "Helps" };
    case "Neutral":
      return { tone: "slate", text: "Neutral" };
    case "Drains":
      return { tone: "rose", text: "Drains" };
  }
  return { tone: "slate", text: "Neutral" };
}

function reliabilityTone(r: Reliability): string {
  if (r === "Consistent") return "emerald";
  if (r === "Often") return "amber";
  return "slate";
}

function useFaceliftData() {
  const [data, setData] = React.useState<FaceliftData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const r = await fetch("/api/insights/facelift", { cache: "no-store", headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as FaceliftData;
        if (isMounted) setData(json);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);
  return { data, loading, error };
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="sr-only">{title}</h2>;
}

function Chip({ item, onOpen }: { item: ChipItem; onOpen: (it: ChipItem) => void }) {
  const eff = toneToBadge(item.effect);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(item)}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      aria-label={`${item.label} — ${item.effect} · ${item.reliability}`}
    >
      <Badge tone={eff.tone as any}>{eff.text}</Badge>
      <Badge tone={reliabilityTone(item.reliability) as any}>{item.reliability}</Badge>
      <span className="text-sm">{item.label}</span>
      <span className="ml-auto text-xs text-white/70">{item.primary}</span>
    </div>
  );
}

function WeekStrip({ best, onPick }: { best: string[]; onPick: (slot: string) => void }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d, i) => {
        const slot = best[i % Math.max(1, best.length)] || "18:00";
        const isBest = i < 2;
        return (
          <button
            key={d}
            className="flex h-12 flex-col items-center justify-center rounded-md border border-white/10 bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label={`Schedule ${d} at ${slot}`}
            onClick={() => onPick(`${d} ${slot}`)}
          >
            <span className="text-xs text-white/70">{d}</span>
            <span className={`mt-1 h-2 w-2 rounded-full ${isBest ? "bg-emerald-400" : "bg-white/30"}`} />
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({ title, why, onAction, onFeedback }: { title: string; why: string; onAction: (action: string) => void; onFeedback: (verdict: "keep" | "not_for_me", reason?: string) => void }) {
  const { toast } = useToast();
  const [askingReason, setAskingReason] = React.useState(false);
  const [reason, setReason] = React.useState("");
  return (
    <Card className="space-y-2">
      <CardContent className="space-y-2 py-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/15 text-violet-300 ring-1 ring-white/10">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium">{title}</div>
            <div className="text-sm text-white/80">Why: {why}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Add to calendar" },
            { label: "Start playlist" },
            { label: "Auto-log template" },
          ].map((a) => (
            <Button key={a.label} variant={a.label === "Add to calendar" ? "default" : "outline"} size="sm" onClick={() => onAction(a.label)}>
              {a.label}
            </Button>
          ))}
        </div>
        {!askingReason ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={async () => { onFeedback("keep"); toast({ title: "Saved", description: "We’ll show more like this." }); }}>Keep</Button>
            <Button size="sm" variant="outline" onClick={() => setAskingReason(true)}>Not for me</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs text-white/70">Reason (required)</label>
            <select className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Select…</option>
              <option value="wrong time">wrong time</option>
              <option value="too hard">too hard</option>
              <option value="don’t like music">don’t like music</option>
              <option value="other">other</option>
            </select>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { if (!reason) return; onFeedback("not_for_me", reason); setAskingReason(false); setReason(""); toast({ title: "Thanks", description: "We’ll adjust future plans." }); }}>Submit</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAskingReason(false); setReason(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FaceliftInner() {
  const { data, loading, error } = useFaceliftData();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetTitle, setSheetTitle] = React.useState("");
  const [sheetLines, setSheetLines] = React.useState<string[]>([]);
  const [activeChip, setActiveChip] = React.useState<ChipItem | null>(null);
  const [detailsOn, setDetailsOn] = React.useState<boolean>(() => {
    try { return localStorage.getItem("insights.details") === "1"; } catch { return false; }
  });
  const router = useRouter();

  React.useEffect(() => {
    try { localStorage.setItem("insights.details", detailsOn ? "1" : "0"); } catch {}
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
          : { "Content-Type": "application/json" };
        const { prefs } = await fetch("/api/preferences", { headers }).then((r) => r.json());
        const next = { ...(prefs || {}), insights_details: detailsOn };
        await fetch("/api/preferences", { method: "POST", headers, body: JSON.stringify({ prefs: next }) });
        await fetch("/api/analytics", { method: "POST", headers, body: JSON.stringify({ event: "details_toggled", payload: { enabled: detailsOn } }) });
      } catch {}
    })();
  }, [detailsOn]);

  function openChipEvidence(it: ChipItem) {
    setSheetTitle(it.label);
    setSheetLines((it.evidence || []).slice(0, 5).concat([it.recommendation || ""]));
    setActiveChip(it);
    setSheetOpen(true);
  }

  async function logEvent(event: string, payload?: any) {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
      await fetch("/api/analytics", { method: "POST", headers, body: JSON.stringify({ event, payload }) });
    } catch {}
  }
  async function sendFeedback(plan_id: string, verdict: "keep" | "not_for_me", reason?: string) {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
      await fetch("/api/plan-feedback", { method: "POST", headers, body: JSON.stringify({ plan_id, verdict, reason }) });
      await logEvent("feedback_submitted", { id: plan_id, verdict, reason });
    } catch {}
  }
  function addToCalendar(title: string) {
    const dtStart = new Date(); dtStart.setDate(dtStart.getDate() + 1);
    const dtEnd = new Date(dtStart.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = ["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT",`DTSTART:${fmt(dtStart)}`,`DTEND:${fmt(dtEnd)}`,`SUMMARY:${title}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "plan.ics"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        <div className="h-28 animate-pulse rounded-xl bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }
  if (error || !data) {
    return <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-sm text-white/80">Failed to load insights.</div>;
  }

  const { weeklySummary, chips, best, plan, wins, tip, states } = data;
  const showSimple = states.newUser;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <SectionHeader title="Weekly Summary" />
      <Card>
        <CardContent className="space-y-3 py-3">
          <div className="text-base">{weeklySummary.line1}</div>
          <div className="text-base">{weeklySummary.line2}</div>
          <div className="flex flex-wrap gap-2">
            {weeklySummary.actions
              .filter((a: any) => states.musicConnected || a.label !== "Start booster playlist")
              .map((a: any) => (
                <Button
                  key={a.id}
                  onClick={() => {
                    if (a.href) window.open(a.href, "_blank");
                    if (a.target) { const el = document.querySelector(a.target) as HTMLElement | null; if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
                    if (a.label === "See why") { setSheetTitle("Why these suggestions"); setSheetLines(weeklySummary.evidence.slice(0, 5)); setActiveChip(null); setSheetOpen(true); }
                    logEvent("summary_action_clicked", { action: a.id });
                  }}
                  variant={a.primary ? "default" : "outline"}
                  size="sm"
                >
                  {a.label}
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      {states.lowData && (
        <div className="rounded-md border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm">Log mood after workouts to sharpen insights.</div>
      )}

      {showSimple ? (
        <Card>
          <CardContent className="space-y-3 py-3">
            <div className="text-base">Try two evening Push sessions with Hip-Hop.</div>
            <Button size="sm" onClick={() => { (async () => { await logEvent("summary_action_clicked", { action: "add_two_evening_push" }); })(); }}>Add both</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <SectionHeader title="What Helps" />
          <Card>
            <CardContent className="space-y-3 py-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {chips.boosters.slice(0, 3).filter((c) => { try { const until = Number(localStorage.getItem(`chip.cooldown.${c.id}`) || 0); return !until || Date.now() > until; } catch { return true; } }).map((c) => (
                  <Chip key={c.id} item={c} onOpen={(it) => openChipEvidence(it)} />
                ))}
                {chips.drainers.slice(0, 2).filter((c) => { try { const until = Number(localStorage.getItem(`chip.cooldown.${c.id}`) || 0); return !until || Date.now() > until; } catch { return true; } }).map((c) => (
                  <Chip key={c.id} item={c} onOpen={(it) => openChipEvidence(it)} />
                ))}
              </div>
            </CardContent>
          </Card>

          <SectionHeader title="Best Times & Pairings" />
          <Card>
            <CardContent className="space-y-3 py-3">
              <WeekStrip best={best.slots} onPick={(slot) => { (async () => { await logEvent("chip_primary_action", { id: `time:${slot}`, action: "Schedule" }); })(); }} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {best.pairings.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/15 text-violet-300 ring-1 ring-white/10"><Music2 className="h-4 w-4" /></div>
                    <span className="text-sm">{p.label}</span>
                    <Badge tone={toneToBadge(p.effect).tone as any} className="ml-auto">{p.effect}</Badge>
                    <Button size="sm" variant="outline" onClick={() => { (async () => { await logEvent("chip_primary_action", { id: p.id, action: "use_pairing" }); })(); }}>Use this</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <SectionHeader title="Your Next 7 Days" />
          <div id="plan" className="space-y-3">
            {plan.slice(0, 3).map((p) => (
              <PlanCard
                key={p.id}
                title={p.title}
                why={p.why}
                onAction={(a) => {
                  if (a === "Add to calendar") addToCalendar(p.title);
                  if (a === "Start playlist") window.open("https://open.spotify.com/search/Booster%20Mix", "_blank");
                  if (a === "Auto-log template") (async () => { await logEvent("plan_action", { id: p.id, action: a }); })();
                }}
                onFeedback={(v, r) => sendFeedback(p.id, v, r)}
              />
            ))}
          </div>
        </>
      )}

      <SectionHeader title="Small Wins & Tips" />
      <Card>
        <CardContent className="space-y-2 py-3">
          <ul className="list-disc pl-5 text-sm text-white/90">
            {wins.slice(0, 2).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <div className="text-sm text-white/80">Tip: {tip}</div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title={sheetTitle}>
        <div className="space-y-2">
          {(sheetLines || []).slice(0, 5).map((line, i) => (
            <div key={i} className="text-sm">{line}</div>
          ))}
          {activeChip && (
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" onClick={() => {
                const it = activeChip; if (!it) return;
                if (it.kind === "music") window.open(`https://open.spotify.com/search/${encodeURIComponent(it.label)}`, "_blank");
                if (it.kind === "workout" || it.kind === "time") { const el = document.querySelector('#plan'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
                try { localStorage.setItem(`chip.cooldown.${it.id}`, String(Date.now() + 7*24*3600*1000)); } catch {}
              }}>{activeChip.primary}</Button>
              <button className="text-xs underline" onClick={() => setSheetOpen(false)}>Close</button>
            </div>
          )}
          <button className="mt-2 text-sm underline underline-offset-2" onClick={() => router.push("/timeline")}>Open on timeline</button>
          <div className="mt-3">
            <label className="inline-flex items-center gap-2 text-xs">
              <input type="checkbox" checked={detailsOn} onChange={(e) => setDetailsOn(e.target.checked)} />
              Details
            </label>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <ToastProvider>
      <FaceliftInner />
      <Toaster />
    </ToastProvider>
  );
}
