"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** ---------- UI helpers ---------- */

function Section({ title, subtitle, children }: any) {
  return (
    <section className="rounded-xl border p-4 bg-white/70 backdrop-blur">
      <div className="mb-3">
        <div className="font-medium">{title}</div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full border text-sm transition",
        active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50 border-gray-200",
      ].join(" ")}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function MultiChip({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <Chip
            key={opt}
            label={opt}
            active={active}
            onClick={() => {
              const next = active ? value.filter((v) => v !== opt) : [...value, opt];
              onChange(next);
            }}
          />
        );
      })}
    </div>
  );
}

function SliderRow({
  label,
  value,
  setValue,
  min = 0,
  max = 10,
  step = 1,
}: {
  label: string;
  value: number | null;
  setValue: (n: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const v = value ?? Math.round((min + max) / 2);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-gray-500">{value === null ? "—" : v}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => setValue(Number(e.target.value))}
        onDoubleClick={() => setValue(null)}
        className="w-full"
      />
      <div className="text-[11px] text-gray-400">
        Double-click to clear
      </div>
    </div>
  );
}

/** ---------- Form component ---------- */

const CONTEXT_OPTIONS = [
  "Home",
  "Work",
  "Gym",
  "Outdoors",
  "Commute",
  "Travel",
  "Studying",
  "Rest Day",
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
  "Alone",
  "With Partner",
  "With Friends",
  "With Family",
];

const TRIGGER_OPTIONS_POS = [
  "Good sleep",
  "Great workout",
  "Hit a goal",
  "Quality time",
  "Nature/sunlight",
  "Meditation",
  "Clean eating",
  "Took a break",
];

const TRIGGER_OPTIONS_NEG = [
  "Poor sleep",
  "Stress at work",
  "Money worries",
  "Relationship conflict",
  "Illness/pain flare",
  "Injury",
  "Excess screen time",
  "Overtrained/fatigued",
  "Skipped meals",
  "Hungover",
];

export default function MoodForm() {
  // Mode
  const [mode, setMode] = useState<"quick" | "guided">("quick");

  // Core
  const [score, setScore] = useState(5);
  const [journal, setJournal] = useState("");
  const [postWorkout, setPostWorkout] = useState(false);

  // Guided sliders (nullable – user can leave blank)
  const [energy, setEnergy] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [anxiety, setAnxiety] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);

  // Sleep
  const [sleepHours, setSleepHours] = useState<string>("");
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);

  // Intake
  const [caffeine, setCaffeine] = useState<string>("None");
  const [caffeineMg, setCaffeineMg] = useState<string>("");
  const [alcohol, setAlcohol] = useState<string>("None");
  const [alcoholUnits, setAlcoholUnits] = useState<string>("");

  // Tags
  const [contexts, setContexts] = useState<string[]>([]);
  const [triggersPos, setTriggersPos] = useState<string[]>([]);
  const [triggersNeg, setTriggersNeg] = useState<string[]>([]);

  // UX
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const caffeinePresetMg = useMemo(() => {
    switch (caffeine) {
      case "Light (≈100mg)": return 100;
      case "Moderate (≈200mg)": return 200;
      case "High (≈300mg+)": return 300;
      default: return 0;
    }
  }, [caffeine]);

  const alcoholPresetUnits = useMemo(() => {
    switch (alcohol) {
      case "1–2 units": return 1.5;
      case "3+ units": return 3;
      default: return 0;
    }
  }, [alcohol]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload: any = {
      score,
      journal: journal.trim() || null,
      post_workout: postWorkout,
      guidance_version: 1,
    };

    // Guided extras (only include if user touched them)
    payload.energy = energy;
    payload.stress = stress;
    payload.anxiety = anxiety;
    payload.focus = focus;
    payload.motivation = motivation;
    payload.soreness = soreness;
    payload.pain_level = pain;

    // Sleep
    const sh = parseFloat(sleepHours);
    if (!Number.isNaN(sh)) payload.sleep_hours = sh;
    if (sleepQuality !== null) payload.sleep_quality = sleepQuality;

    // Intake
    const cafFromPreset = caffeinePresetMg || 0;
    const cafFromCustom = parseInt(caffeineMg, 10);
    const caffeineTotal = (Number.isNaN(cafFromCustom) ? cafFromPreset : cafFromCustom);
    if (caffeine !== "None" || caffeineMg) payload.caffeine_mg = Math.max(0, caffeineTotal);

    const alcPreset = alcoholPresetUnits || 0;
    const alcCustom = parseFloat(alcoholUnits);
    const alcoholTotal = (Number.isNaN(alcCustom) ? alcPreset : alcCustom);
    if (alcohol !== "None" || alcoholUnits) payload.alcohol_units = Math.max(0, alcoholTotal);

    // Tags
    const mergedTriggers = [...triggersPos.map((t) => `+ ${t}`), ...triggersNeg.map((t) => `- ${t}`)];
    if (contexts.length) payload.contexts = contexts;
    if (mergedTriggers.length) payload.triggers = mergedTriggers;

    const { error } = await supabase.from("moods").insert(payload);

    setSaving(false);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Saved!");
      // reset quick-ish, keep mode
      setJournal("");
      setPostWorkout(false);
      setEnergy(null); setStress(null); setAnxiety(null); setFocus(null); setMotivation(null); setSoreness(null); setPain(null);
      setSleepHours(""); setSleepQuality(null);
      setCaffeine("None"); setCaffeineMg("");
      setAlcohol("None"); setAlcoholUnits("");
      setContexts([]); setTriggersPos([]); setTriggersNeg([]);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Mode switch */}
      <div className="flex gap-2">
        <button
          type="button"
          className={[
            "px-3 py-1.5 rounded-full border text-sm",
            mode === "quick" ? "bg-black text-white border-black" : "bg-white border-gray-200"
          ].join(" ")}
          onClick={() => setMode("quick")}
        >
          Quick
        </button>
        <button
          type="button"
          className={[
            "px-3 py-1.5 rounded-full border text-sm",
            mode === "guided" ? "bg-black text-white border-black" : "bg-white border-gray-200"
          ].join(" ")}
          onClick={() => setMode("guided")}
        >
          Guided
        </button>
      </div>

      {/* Quick core */}
      <Section
        title={`Mood Score: ${score}/10`}
        subtitle="Drag to set how you feel overall right now."
      >
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-full"
        />
        <div className="mt-3">
          <label className="block text-sm mb-1">Journal (optional)</label>
          <textarea
            className="w-full border rounded p-2 min-h-[120px]"
            placeholder="How are you feeling?"
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
          />
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={postWorkout}
            onChange={(e) => setPostWorkout(e.target.checked)}
          />
          Post-workout?
        </label>
      </Section>

      {/* Guided extras */}
      {mode === "guided" && (
        <>
          <Section
            title="State check"
            subtitle="Optional sliders. Double-click a slider to clear it."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SliderRow label="Energy" value={energy} setValue={setEnergy} />
              <SliderRow label="Stress" value={stress} setValue={setStress} />
              <SliderRow label="Anxiety" value={anxiety} setValue={setAnxiety} />
              <SliderRow label="Focus" value={focus} setValue={setFocus} />
              <SliderRow label="Motivation" value={motivation} setValue={setMotivation} />
              <SliderRow label="Soreness" value={soreness} setValue={setSoreness} />
              <SliderRow label="Pain level" value={pain} setValue={setPain} />
            </div>
          </Section>

          <Section title="Sleep" subtitle="Add any details you have.">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm mb-1">Hours (0–24)</label>
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  className="w-full border rounded p-2"
                  placeholder="e.g., 7.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <SliderRow label="Sleep quality" value={sleepQuality} setValue={setSleepQuality} />
              </div>
            </div>
          </Section>

          <Section title="Intake (optional)" subtitle="Rough estimates are fine.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm">Caffeine</div>
                <div className="flex flex-wrap gap-2">
                  {["None", "Light (≈100mg)", "Moderate (≈200mg)", "High (≈300mg+)"].map((opt) => (
                    <Chip key={opt} label={opt} active={caffeine === opt} onClick={() => setCaffeine(opt)} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={50}
                    className="border rounded p-2 w-40"
                    placeholder="Custom mg"
                    value={caffeineMg}
                    onChange={(e) => setCaffeineMg(e.target.value)}
                  />
                  <span className="text-xs text-gray-500">
                    Using {caffeinePresetMg || 0} mg from preset unless custom entered
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm">Alcohol</div>
                <div className="flex flex-wrap gap-2">
                  {["None", "1–2 units", "3+ units"].map((opt) => (
                    <Chip key={opt} label={opt} active={alcohol === opt} onClick={() => setAlcohol(opt)} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="border rounded p-2 w-40"
                    placeholder="Custom units"
                    value={alcoholUnits}
                    onChange={(e) => setAlcoholUnits(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Context" subtitle="Where/when/who. Pick any that apply.">
            <MultiChip options={CONTEXT_OPTIONS} value={contexts} onChange={setContexts} />
          </Section>

          <Section title="Triggers" subtitle="What moved the needle today? Pick all that apply.">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-green-700 mb-1">Positive</div>
                <MultiChip options={TRIGGER_OPTIONS_POS} value={triggersPos} onChange={setTriggersPos} />
              </div>
              <div>
                <div className="text-xs text-red-700 mb-1">Negative</div>
                <MultiChip options={TRIGGER_OPTIONS_NEG} value={triggersNeg} onChange={setTriggersNeg} />
              </div>
            </div>
          </Section>
        </>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button disabled={saving} className="px-4 py-2 rounded bg-black text-white">
          {saving ? "Saving…" : "Save Mood"}
        </button>
        {message && <span className="text-sm">{message}</span>}
      </div>

      <p className="text-[11px] text-gray-500">
        Tip: Use <span className="font-medium">Quick</span> for fast check-ins. Switch to <span className="font-medium">Guided</span> when you want structure.
      </p>
    </form>
  );
}
