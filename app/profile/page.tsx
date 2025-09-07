"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* =========================
   Types & small UI helpers
   ========================= */

type SexOpt = "male" | "female" | "other" | "prefer_not";
type ActivityOpt = "sedentary" | "light" | "moderate" | "active" | "athlete";
type GoalOpt = "fat_loss" | "maintenance" | "muscle_gain" | "performance" | "wellbeing";

type Profile = {
  id: string;
  email?: string | null;

  // Identity
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  dob?: string | null;
  sex?: SexOpt | null;
  timezone?: string | null;
  country?: string | null;

  // Body metrics
  height_cm?: number | null;
  weight_kg?: number | null;
  bodyfat_percent?: number | null;
  resting_hr?: number | null;
  max_hr?: number | null;
  vo2max?: number | null;

  // Lifestyle / goals
  activity_level?: ActivityOpt | null;
  primary_goal?: GoalOpt | null;

  // Units & prefs
  units_weight?: "kg" | "lb" | null;
  units_length?: "cm" | "in" | null;
  units_distance?: "km" | "mi" | null;
  units_energy?: "kcal" | "kJ" | null;
  show_advanced?: boolean | null;

  // Spotify integration flags
  spotify_connected?: boolean | null;
  spotify_user_id?: string | null;
  spotify_scopes?: string[] | null;
  spotify_last_sync_at?: string | null;
};

const ACTIVITY_FACTORS: Record<ActivityOpt, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-3">
        <div className="font-medium">{title}</div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm mb-1">{label}</div>
      {children}
    </label>
  );
}

/* =========================
   Page Component
   ========================= */

export default function ProfilePage() {

  const [email, setEmail] = useState<string | null>(null);
  const [p, setP] = useState<Profile | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Spotify UX/debug
  const [busy, setBusy] = useState(false);
  const [finalizedOnce, setFinalizedOnce] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [hostWarn, setHostWarn] = useState<string | null>(null);

  const log = (s: string) => {
    const line = `[${new Date().toISOString()}] ${s}`;
    setDebugLines((prev) => [...prev, line]);
    // eslint-disable-next-line no-console
    console.log("[Spotify Debug]", line);
  };

  /* -------- Host check: Spotify only accepts 127.0.0.1 for you -------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    if (host !== "127.0.0.1") {
      setHostWarn(
        `You are on "${host}". Your Spotify redirect is set to "127.0.0.1". Please open the app at http://127.0.0.1:3000`
      );
      log(`Host mismatch: on ${host}, expected 127.0.0.1`);
    } else {
      setHostWarn(null);
    }
  }, []);

  /* -------- Load current user + profile -------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        setP(null);
        setEmail(null);
        return;
      }
      setEmail(u.email ?? null);
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();

      setP({
        id: u.id,
        email: u.email ?? null,
        units_weight: "kg",
        units_length: "cm",
        units_distance: "km",
        units_energy: "kcal",
        show_advanced: true,
        ...(prof || {}),
      } as Profile);
    })();
  }, []);

  /* -------- Derived metrics -------- */
  const age = useMemo(() => {
    if (!p?.dob) return null;
    const today = new Date();
    const dob = new Date(p.dob);
    let a = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
    return a;
  }, [p?.dob]);

  const heightM = useMemo(() => (p?.height_cm ? Number(p.height_cm) / 100 : null), [p?.height_cm]);

  const bmi = useMemo(() => {
    if (!heightM || !p?.weight_kg) return null;
    const b = Number(p.weight_kg) / (heightM * heightM);
    return Math.round(b * 10) / 10;
  }, [heightM, p?.weight_kg]);

  const bmr = useMemo(() => {
    if (!p?.weight_kg || !p?.height_cm || age == null) return null;
    const w = Number(p.weight_kg);
    const h = Number(p.height_cm);
    const a = Number(age);
    const base = 10 * w + 6.25 * h - 5 * a;
    if (p.sex === "male") return Math.round(base + 5);
    if (p.sex === "female") return Math.round(base - 161);
    return Math.round(base - 80); // neutral approx
  }, [p?.weight_kg, p?.height_cm, age, p?.sex]);

  const tdee = useMemo(() => {
    if (!bmr) return null;
    const f = p?.activity_level ? ACTIVITY_FACTORS[p.activity_level] : 1.4;
    return Math.round(bmr * f);
  }, [bmr, p?.activity_level]);

  /* -------- Save profile -------- */
  async function saveProfile() {
    if (!p?.id) return;
    setSaving(true);
    setMsg(null);
    const payload = { ...p, email };
    delete (payload as any).bmi;
    delete (payload as any).bmr;
    delete (payload as any).tdee;

    const { error } = await supabase.from("profiles").upsert(payload as any);
    setSaving(false);
    setMsg(error ? error.message : "Saved!");
  }

  /* -------- Spotify: finalize attach (idempotent server route) -------- */
  async function finalizeSpotify() {
    setBusy(true);
    setMsg(null);
    try {
      log("Finalize: starting");
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        log("Finalize: no Supabase session token");
        throw new Error("No session token");
      }
      log("Finalize: POST /api/spotify/my/attach with bearer");
      const res = await fetch("/api/spotify/my/attach", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      log(`Finalize: attach status ${res.status} body: ${text}`);
      let j: any = null;
      try {
        j = JSON.parse(text);
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        throw new Error(j?.error || `Attach failed (${res.status})`);
      }

      setP((prev) => (prev ? { ...prev, spotify_connected: true } : prev));
      log("Finalize: success -> profile updated");
    } catch (e: any) {
      const m = e?.message || "Spotify attach failed";
      setMsg(m);
      log(`Finalize: ERROR -> ${m}`);
    } finally {
      setBusy(false);
    }
  }

  /* -------- Spotify: manual sync (recent) -------- */
  async function syncSpotify() {
    setBusy(true);
    setMsg(null);
    try {
      log("Sync: starting");
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        log("Sync: no Supabase session token");
        throw new Error("No session token");
      }
      const res = await fetch("/api/spotify/my/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      log(`Sync: status ${res.status} body: ${text}`);
      let j: any = null;
      try {
        j = JSON.parse(text);
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        throw new Error(j?.error || `Sync failed (${res.status})`);
      }
      setP((prev) => (prev ? { ...prev, spotify_last_sync_at: new Date().toISOString() } : prev));
      alert(`Imported ${j.imported ?? 0} plays`);
    } catch (e: any) {
      const m = e?.message || "Spotify sync failed";
      setMsg(m);
      log(`Sync: ERROR -> ${m}`);
    } finally {
      setBusy(false);
    }
  }

  /* -------- Spotify: full re-sync (24h window) -------- */
  async function fullResync() {
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch("/api/spotify/my/sync?full=1", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const j = await res.json().catch(() => ({}));
      alert(`Full re-sync: items_received=${j.items_received ?? "?"}, imported=${j.imported ?? "?"}`);
    } finally {
      setBusy(false);
    }
  }

  /* -------- Spotify: reset cursor -------- */
  async function resetCursor() {
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      await fetch("/api/spotify/my/reset-cursor", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      alert("Cursor reset. Run Full re-sync next.");
    } finally {
      setBusy(false);
    }
  }

  /* -------- Enrich metadata (ISRC + Deezer + Last.fm) -------- */
  async function enrichMetadata() {
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch("/api/enrich/run", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const j = await res.json().catch(() => ({}));
      log(`Enrich result: ${JSON.stringify(j)}`);
      alert(
        `Enrich finished:\n\n` +
          `ISRC => ${j?.isrc?.status ?? "?"}: ${JSON.stringify(j?.isrc?.json ?? {})}\n\n` +
          `Deezer => ${j?.deezer?.status ?? "?"}: ${JSON.stringify(j?.deezer?.json ?? {})}\n\n` +
          `Lastfm => ${j?.lastfm?.status ?? "?"}: ${JSON.stringify(j?.lastfm?.json ?? {})}`
      );
    } catch (e: any) {
      alert(`Enrich failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  /* -------- Server-side cookie inspector (debug) -------- */
  async function checkServerCookies() {
    try {
      const res = await fetch("/api/spotify/debug-cookies");
      const j = await res.json();
      log(`DebugCookies: ${JSON.stringify(j)}`);
      alert(`Server sees cookies: ${JSON.stringify(j.cookies)}`);
    } catch (e: any) {
      log(`DebugCookies ERROR: ${e?.message || e}`);
    }
  }

  /* -------- Auto-finalize once after redirect -------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("spotify");
    const origin = window.location.origin;
    if (flag) log(`Arrived on ${origin} with ?spotify=${flag}`);
    if (flag === "connected" && p && !p.spotify_connected && !finalizedOnce) {
      setFinalizedOnce(true);
      finalizeSpotify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.spotify_connected, finalizedOnce]);

  if (!p) return <p className="text-sm text-gray-600">Loading profile…</p>;

  /* =========================
     Render
     ========================= */

  return (
    <div className="space-y-6">
      {hostWarn && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {hostWarn}
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <div className="text-sm text-gray-500">{email || "—"}</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: Identity, Body metrics, Lifestyle */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity */}
          <Card title="Identity">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <input
                  className="w-full border rounded p-2"
                  value={p.display_name ?? ""}
                  onChange={(e) => setP({ ...p, display_name: e.target.value })}
                  placeholder="What should we call you?"
                />
              </Field>
              <Field label="Country (optional)">
                <input
                  className="w-full border rounded p-2"
                  value={p.country ?? ""}
                  onChange={(e) => setP({ ...p, country: e.target.value })}
                  placeholder="e.g., UK"
                />
              </Field>

              <Field label="First name">
                <input
                  className="w-full border rounded p-2"
                  value={p.first_name ?? ""}
                  onChange={(e) => setP({ ...p, first_name: e.target.value })}
                />
              </Field>
              <Field label="Last name">
                <input
                  className="w-full border rounded p-2"
                  value={p.last_name ?? ""}
                  onChange={(e) => setP({ ...p, last_name: e.target.value })}
                />
              </Field>

              <Field label="Date of birth">
                <input
                  type="date"
                  className="w-full border rounded p-2"
                  value={p.dob ?? ""}
                  onChange={(e) => setP({ ...p, dob: e.target.value || null })}
                />
              </Field>
              <Field label="Sex">
                <select
                  className="w-full border rounded p-2"
                  value={p.sex ?? ""}
                  onChange={(e) => setP({ ...p, sex: (e.target.value as SexOpt) || null })}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not">Prefer not</option>
                </select>
              </Field>

              <Field label="Timezone">
                <input
                  className="w-full border rounded p-2"
                  value={p.timezone ?? ""}
                  onChange={(e) => setP({ ...p, timezone: e.target.value })}
                  placeholder="e.g., Europe/London"
                />
              </Field>
            </div>
          </Card>

          {/* Body metrics */}
          <Card title="Body metrics" subtitle="Use your preferred units; we store metric internally.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Height (${p.units_length === "in" ? "in" : "cm"})`}>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={
                    p.units_length === "in"
                      ? (p.height_cm ? Math.round(Number(p.height_cm) / 2.54) : "")
                      : (p.height_cm ?? "")
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") return setP({ ...p, height_cm: null });
                    const val = Number(raw);
                    const cm = p.units_length === "in" ? val * 2.54 : val;
                    setP({ ...p, height_cm: Number.isFinite(cm) ? Number(cm.toFixed(2)) : null });
                  }}
                  placeholder={p.units_length === "in" ? "e.g., 70" : "e.g., 178"}
                />
              </Field>

              <Field label={`Weight (${p.units_weight === "lb" ? "lb" : "kg"})`}>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={
                    p.units_weight === "lb"
                      ? (p.weight_kg ? Math.round(Number(p.weight_kg) * 2.20462) : "")
                      : (p.weight_kg ?? "")
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") return setP({ ...p, weight_kg: null });
                    const val = Number(raw);
                    const kg = p.units_weight === "lb" ? val / 2.20462 : val;
                    setP({ ...p, weight_kg: Number.isFinite(kg) ? Number(kg.toFixed(2)) : null });
                  }}
                  placeholder={p.units_weight === "lb" ? "e.g., 180" : "e.g., 82"}
                />
              </Field>

              <Field label="Body fat % (optional)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  className="w-full border rounded p-2"
                  value={p.bodyfat_percent ?? ""}
                  onChange={(e) =>
                    setP({
                      ...p,
                      bodyfat_percent: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder="e.g., 18"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Resting HR">
                  <input
                    type="number"
                    className="w-full border rounded p-2"
                    value={p.resting_hr ?? ""}
                    onChange={(e) =>
                      setP({
                        ...p,
                        resting_hr: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="e.g., 60"
                  />
                </Field>
                <Field label="Max HR">
                  <input
                    type="number"
                    className="w-full border rounded p-2"
                    value={p.max_hr ?? ""}
                    onChange={(e) =>
                      setP({
                        ...p,
                        max_hr: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="e.g., 190"
                  />
                </Field>
              </div>

              <Field label="VO₂max (optional)">
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={p.vo2max ?? ""}
                  onChange={(e) =>
                    setP({ ...p, vo2max: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  placeholder="e.g., 45"
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Weight units">
                <select
                  className="w-full border rounded p-2"
                  value={p.units_weight ?? "kg"}
                  onChange={(e) => setP({ ...p, units_weight: e.target.value as "kg" | "lb" })}
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </Field>
              <Field label="Length units">
                <select
                  className="w-full border rounded p-2"
                  value={p.units_length ?? "cm"}
                  onChange={(e) => setP({ ...p, units_length: e.target.value as "cm" | "in" })}
                >
                  <option value="cm">cm</option>
                  <option value="in">inches</option>
                </select>
              </Field>
              <Field label="Distance units">
                <select
                  className="w-full border rounded p-2"
                  value={p.units_distance ?? "km"}
                  onChange={(e) => setP({ ...p, units_distance: e.target.value as "km" | "mi" })}
                >
                  <option value="km">km</option>
                  <option value="mi">miles</option>
                </select>
              </Field>
              <Field label="Energy units">
                <select
                  className="w-full border rounded p-2"
                  value={p.units_energy ?? "kcal"}
                  onChange={(e) => setP({ ...p, units_energy: e.target.value as "kcal" | "kJ" })}
                >
                  <option value="kcal">kcal</option>
                  <option value="kJ">kJ</option>
                </select>
              </Field>
            </div>
          </Card>

          {/* Lifestyle & Goals */}
          <Card title="Lifestyle & goals">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Activity level">
                <select
                  className="w-full border rounded p-2"
                  value={p.activity_level ?? ""}
                  onChange={(e) =>
                    setP({ ...p, activity_level: (e.target.value as ActivityOpt) || null })
                  }
                >
                  <option value="">Select…</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                  <option value="athlete">Athlete</option>
                </select>
              </Field>

              <Field label="Primary goal">
                <select
                  className="w-full border rounded p-2"
                  value={p.primary_goal ?? ""}
                  onChange={(e) =>
                    setP({ ...p, primary_goal: (e.target.value as GoalOpt) || null })
                  }
                >
                  <option value="">Select…</option>
                  <option value="fat_loss">Fat loss</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="muscle_gain">Muscle gain</option>
                  <option value="performance">Performance</option>
                  <option value="wellbeing">Wellbeing</option>
                </select>
              </Field>
            </div>

            <label className="mt-3 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!p.show_advanced}
                onChange={(e) => setP({ ...p, show_advanced: e.target.checked })}
              />
              Show advanced insights
            </label>
          </Card>

          <div className="flex items-center gap-3">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-4 py-2 rounded bg-black text-white"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </div>

        {/* RIGHT: Baseline + Spotify + Debug + Privacy */}
        <div className="space-y-6">
          <Card title="Your baseline" subtitle="Derived from your inputs">
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Age</span>
                <span className="font-medium">{age ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">BMI</span>
                <span className="font-medium">{bmi ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">BMR</span>
                <span className="font-medium">{bmr ? `${bmr} ${p.units_energy ?? "kcal"}` : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">TDEE (est.)</span>
                <span className="font-medium">{tdee ? `${tdee} ${p.units_energy ?? "kcal"}` : "—"}</span>
              </div>
            </div>
          </Card>

          <Card title="Spotify" subtitle="Connect to enrich pre/during-workout context.">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  Status:{" "}
                  {p.spotify_connected ? (
                    <span className="text-green-700 font-medium">Connected</span>
                  ) : (
                    <span className="text-gray-500">Not connected</span>
                  )}
                </div>
                {p.spotify_last_sync_at && (
                  <div className="text-xs text-gray-500">
                    Last sync: {new Date(p.spotify_last_sync_at).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {!p.spotify_connected ? (
                  <>
                    <button
  className="px-3 py-2 border rounded"
  onClick={() => { window.location.href = "/api/spotify/start"; }}
>
  Connect Spotify
</button>
                    <button className="px-3 py-2 border rounded" onClick={finalizeSpotify} disabled={busy}>
                      Finalize connection
                    </button>
                    <button className="px-3 py-2 border rounded" onClick={checkServerCookies}>
                      Check server cookies
                    </button>
                  </>
                ) : (
                  <>
                    <button className="px-3 py-2 border rounded" onClick={syncSpotify} disabled={busy}>
                      Sync now
                    </button>
                    <button className="px-3 py-2 border rounded" onClick={fullResync} disabled={busy}>
                      Full re-sync (24h)
                    </button>
                    <button className="px-3 py-2 border rounded" onClick={resetCursor} disabled={busy}>
                      Reset cursor
                    </button>
                    <button className="px-3 py-2 border rounded" onClick={enrichMetadata} disabled={busy}>
                      Enrich metadata
                    </button>
                    <button
                      className="px-3 py-2 border rounded"
                      onClick={async () => {
                        const { error } = await supabase
                          .from("profiles")
                          .update({
                            spotify_connected: false,
                            spotify_user_id: null,
                            spotify_scopes: [],
                            spotify_last_sync_at: null,
                          })
                          .eq("id", p.id);
                        if (!error) {
                          setP({
                            ...p,
                            spotify_connected: false,
                            spotify_user_id: null,
                            spotify_scopes: [],
                            spotify_last_sync_at: null,
                          });
                        }
                      }}
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>

              <p className="text-xs text-gray-500">
                We pull your <span className="font-medium">Recently Played</span> (up to 50, last 24h) and enrich with audio features (BPM, energy, valence) and artist genres.
              </p>
            </div>
          </Card>

          <Card title="Spotify debug panel" subtitle="For local troubleshooting">
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <button className="px-3 py-2 border rounded" onClick={() => setDebugOpen((v) => !v)}>
                  {debugOpen ? "Hide logs" : "Show logs"}
                </button>
                <button className="px-3 py-2 border rounded" onClick={() => setDebugLines([])}>
                  Clear logs
                </button>
                <button className="px-3 py-2 border rounded" onClick={checkServerCookies}>
                  Check server cookies
                </button>
              </div>
              {debugOpen && (
                <pre className="max-h-64 overflow-auto text-xs bg-gray-50 border rounded p-2">
{debugLines.length ? debugLines.join("\n") : "No logs yet."}
                </pre>
              )}
              <div className="text-[11px] text-gray-500">
                Tip: Make sure you’re visiting <code>http://127.0.0.1:3000</code> (not <code>localhost</code>) if that’s the only redirect URI added in Spotify.
              </div>
            </div>
          </Card>

          <Card title="Privacy" subtitle="Your data is private to you.">
            <p className="text-sm text-gray-600">
              Journals and mood details are protected by Row-Level Security. Admin tools access only aggregates, never your raw entries.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
