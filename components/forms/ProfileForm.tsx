"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardBody, CardFooter, Button, Chip } from "@nextui-org/react";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  dob: string | null; // YYYY-MM-DD
  sex: "male" | "female" | "other" | "prefer_not" | null;
  timezone: string | null;
  country: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  bodyfat_percent: number | null;
  resting_hr: number | null;
  max_hr: number | null;
  vo2max: number | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "athlete" | null;
  primary_goal: "fat_loss" | "maintenance" | "muscle_gain" | "performance" | "wellbeing" | null;
  units_weight: "kg" | "lb" | null;
  units_length: "cm" | "in" | null;
  units_distance: "km" | "mi" | null;
  units_energy: "kcal" | "kJ" | null;
  show_advanced: boolean | null;
  spotify_connected?: boolean | null;
  spotify_user_id?: string | null;
  spotify_last_sync_at?: string | null;
  spotify_scope_str?: string | null;
  spotify_scopes?: string[] | null;
};

const sexOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
] as const;

const activityOptions = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "active", label: "Active" },
  { value: "athlete", label: "Athlete" },
] as const;

const goalOptions = [
  { value: "fat_loss", label: "Fat loss" },
  { value: "maintenance", label: "Maintenance" },
  { value: "muscle_gain", label: "Muscle gain" },
  { value: "performance", label: "Performance" },
  { value: "wellbeing", label: "Wellbeing" },
] as const;

const unitWeight = ["kg", "lb"] as const;
const unitLength = ["cm", "in"] as const;
const unitDistance = ["km", "mi"] as const;
const unitEnergy = ["kcal", "kJ"] as const;

export default function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Profile>>({});

  const timezones = useMemo(() => {
    try {
      const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
      const tz = intl.supportedValuesOf?.("timeZone") || [];
      if (Array.isArray(tz) && tz.length) return tz;
    } catch {}
    return [] as string[];
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: ures } = await supabase.auth.getUser();
        const uid = ures.user?.id ?? null;
        const mail = ures.user?.email ?? null;
        setUserId(uid);

        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .maybeSingle();

        const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const dobStr = prof?.dob ? new Date(String(prof.dob)).toISOString().slice(0, 10) : null;

        setForm({
          id: uid || prof?.id,
          email: mail ?? prof?.email ?? null,
          display_name: prof?.display_name ?? null,
          first_name: prof?.first_name ?? null,
          last_name: prof?.last_name ?? null,
          dob: dobStr,
          sex: (prof?.sex as any) ?? null,
          timezone: prof?.timezone ?? localTz ?? null,
          country: prof?.country ?? null,
          height_cm: prof?.height_cm ?? null,
          weight_kg: prof?.weight_kg ?? null,
          bodyfat_percent: prof?.bodyfat_percent ?? null,
          resting_hr: prof?.resting_hr ?? null,
          max_hr: prof?.max_hr ?? null,
          vo2max: prof?.vo2max ?? null,
          activity_level: (prof?.activity_level as any) ?? null,
          primary_goal: (prof?.primary_goal as any) ?? null,
          units_weight: (prof?.units_weight as any) ?? "kg",
          units_length: (prof?.units_length as any) ?? "cm",
          units_distance: (prof?.units_distance as any) ?? "km",
          units_energy: (prof?.units_energy as any) ?? "kcal",
          show_advanced: prof?.show_advanced ?? true,
          spotify_connected: prof?.spotify_connected ?? null,
          spotify_user_id: prof?.spotify_user_id ?? null,
          spotify_last_sync_at: prof?.spotify_last_sync_at ?? null,
          spotify_scope_str: prof?.spotify_scope_str ?? null,
          spotify_scopes: prof?.spotify_scopes ?? null,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // local helper not needed; update fields inline where used

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload: any = {
        id: userId,
        display_name: form.display_name || null,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        dob: form.dob ? new Date(`${form.dob}T00:00:00Z`).toISOString() : null,
        sex: form.sex || null,
        timezone: form.timezone || null,
        country: form.country || null,
        height_cm: form.height_cm === null || form.height_cm === undefined || form.height_cm === ("" as any) ? null : Number(form.height_cm),
        weight_kg: form.weight_kg === null || form.weight_kg === undefined || form.weight_kg === ("" as any) ? null : Number(form.weight_kg),
        bodyfat_percent: form.bodyfat_percent === null || form.bodyfat_percent === undefined || form.bodyfat_percent === ("" as any) ? null : Number(form.bodyfat_percent),
        resting_hr: form.resting_hr === null || form.resting_hr === undefined || form.resting_hr === ("" as any) ? null : Number(form.resting_hr),
        max_hr: form.max_hr === null || form.max_hr === undefined || form.max_hr === ("" as any) ? null : Number(form.max_hr),
        vo2max: form.vo2max === null || form.vo2max === undefined || form.vo2max === ("" as any) ? null : Number(form.vo2max),
        activity_level: form.activity_level || null,
        primary_goal: form.primary_goal || null,
        units_weight: form.units_weight || "kg",
        units_length: form.units_length || "cm",
        units_distance: form.units_distance || "km",
        units_energy: form.units_energy || "kcal",
        show_advanced: !!form.show_advanced,
      };

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      setMessage("Profile updated");
    } catch (e: any) {
      setMessage(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border border-white/10 bg-white/5">
        <CardBody>
          <div className="text-sm text-white/70">Loading profile…</div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="border border-white/10 bg-white/5">
      <CardHeader>
        <div>
          <h2 className="text-lg font-semibold">Profile details</h2>
          <p className="text-xs text-white/60">View and update your information</p>
        </div>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Display name</span>
              <input
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.display_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="Shown in the app"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">First name</span>
              <input
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.first_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Last name</span>
              <input
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.last_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Date of birth</span>
              <input
                type="date"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.dob ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Sex</span>
              <select
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.sex ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, sex: (e.target.value || null) as Profile["sex"] }))}
              >
                <option value="">—</option>
                {sexOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Timezone</span>
              {timezones.length ? (
                <select
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={form.timezone ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                >
                  {timezones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={form.timezone ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  placeholder="e.g. Europe/London"
                />
              )}
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Country</span>
              <input
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.country ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="e.g. UK, US, AU"
              />
            </label>
          </div>

          {/* Body metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Height ({form.units_length || "cm"})</span>
              <input
                type="number"
                min={0}
                step={0.1}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.height_cm ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, height_cm: e.target.value === "" ? null : Number(e.target.value) }))}
                placeholder="cm"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Weight ({form.units_weight || "kg"})</span>
              <input
                type="number"
                min={0}
                step={0.1}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.weight_kg ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, weight_kg: e.target.value === "" ? null : Number(e.target.value) }))}
                placeholder="kg"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Body fat (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.bodyfat_percent ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bodyfat_percent: e.target.value === "" ? null : Number(e.target.value) }))}
                placeholder="%"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Resting HR</span>
              <input
                type="number"
                min={0}
                step={1}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.resting_hr ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, resting_hr: e.target.value === "" ? null : Number(e.target.value) }))}
                placeholder="bpm"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Max HR</span>
              <input
                type="number"
                min={0}
                step={1}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.max_hr ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_hr: e.target.value === "" ? null : Number(e.target.value) }))}
                placeholder="bpm"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">VO2max</span>
              <input
                type="number"
                min={0}
                step={0.1}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.vo2max ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vo2max: e.target.value === "" ? null : Number(e.target.value) }))}
                placeholder="mL/kg/min"
              />
            </label>
          </div>

          {/* Preferences */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Activity level</span>
              <select
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.activity_level ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, activity_level: (e.target.value || null) as Profile["activity_level"] }))}
              >
                <option value="">—</option>
                {activityOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Primary goal</span>
              <select
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.primary_goal ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, primary_goal: (e.target.value || null) as Profile["primary_goal"] }))}
              >
                <option value="">—</option>
                {goalOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-white/5"
                checked={!!form.show_advanced}
                onChange={(e) => setForm((f) => ({ ...f, show_advanced: e.target.checked }))}
              />
              <span className="text-sm text-white/80">Show advanced features</span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Weight units</span>
              <select
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.units_weight ?? "kg"}
                onChange={(e) => setForm((f) => ({ ...f, units_weight: e.target.value as Profile["units_weight"] }))}
              >
                {unitWeight.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Length units</span>
              <select
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.units_length ?? "cm"}
                onChange={(e) => setForm((f) => ({ ...f, units_length: e.target.value as Profile["units_length"] }))}
              >
                {unitLength.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Distance units</span>
              <select
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.units_distance ?? "km"}
                onChange={(e) => setForm((f) => ({ ...f, units_distance: e.target.value as Profile["units_distance"] }))}
              >
                {unitDistance.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/80">Energy units</span>
              <select
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.units_energy ?? "kcal"}
                onChange={(e) => setForm((f) => ({ ...f, units_energy: e.target.value as Profile["units_energy"] }))}
              >
                {unitEnergy.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Spotify info (read-only) */}
          {form.spotify_user_id || form.spotify_connected ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-sm text-white/80">Spotify status</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 text-sm">
                <div>
                  <span className="text-white/60">Connected: </span>
                  <span className="font-medium">{form.spotify_connected ? "Yes" : "No"}</span>
                </div>
                <div className="truncate">
                  <span className="text-white/60">User ID: </span>
                  <span className="font-mono">{form.spotify_user_id || "—"}</span>
                </div>
                <div>
                  <span className="text-white/60">Last sync: </span>
                  <span>{form.spotify_last_sync_at ? new Date(form.spotify_last_sync_at).toLocaleString() : "—"}</span>
                </div>
                <div>
                  <span className="text-white/60">Scopes: </span>
                  <span>{form.spotify_scope_str || "—"}</span>
                </div>
              </div>
              {!!form.spotify_scopes?.length && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.spotify_scopes.map((s) => (
                    <Chip key={s} size="sm" variant="flat" className="bg-white/5">{s}</Chip>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {message && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/90">{message}</div>
          )}

          <CardFooter className="flex items-center justify-end">
            <Button color="secondary" type="submit" isLoading={saving}>
              Save changes
            </Button>
          </CardFooter>
        </form>
      </CardBody>
    </Card>
  );
}
