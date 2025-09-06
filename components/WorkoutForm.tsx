"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { computeVolume } from "@/lib/utils";

type SetInput = { reps: number; weight: number };
type ExerciseBlock = {
  exercise_id: string | null;
  exercise_name: string;
  sets: SetInput[];
};

type SplitRow = { id: string; name: string; is_global?: boolean };
type ExerciseRow = { id: string; name: string; is_global?: boolean };
type BodyPartRow = { id: string; name: string; is_global?: boolean };

const SPLIT_ICON: Record<string, string> = {
  push: "🫷", pull: "🫸", legs: "🦵", upper: "💪", lower: "🦶",
  arms: "🦾", back: "🧱", full: "🧩", shoulders: "🧑‍🦱", chest: "🫁"
};
function iconForSplit(name: string) {
  const key = name.trim().toLowerCase();
  const match = Object.keys(SPLIT_ICON).find((k) => key.includes(k));
  return SPLIT_ICON[match ?? ""] ?? "🏋️";
}

const CHIP_SUGGESTED = "SUGGESTED";
const CHIP_ALL = "ALL";
const CHIP_UNCAT = "UNCAT";

export default function WorkoutForm() {
  // Header
  const [name, setName] = useState("");

  // Training Day tiles
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [selectedSplitId, setSelectedSplitId] = useState<string>("");

  // Body part filter
  const [parts, setParts] = useState<BodyPartRow[]>([]);
  const [activeChip, setActiveChip] = useState<string>(CHIP_ALL);
  const [suggestedParts, setSuggestedParts] = useState<BodyPartRow[]>([]);

  // Exercise tiles
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [exSearch, setExSearch] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [exerciseErr, setExerciseErr] = useState<string | null>(null);

  // Selected exercises (blocks)
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const blocksRef = useRef<HTMLDivElement>(null);

  // --------------- Data loaders ---------------

  async function loadSplits() {
    const { data } = await supabase
      .from("training_splits")
      .select("id,name,is_global")
      .order("is_global", { ascending: false })
      .order("name");
    setSplits((data as any) ?? []);
  }

  async function loadBodyParts() {
    const { data } = await supabase
      .from("body_parts")
      .select("id,name,is_global")
      .order("is_global", { ascending: false })
      .order("name");
    setParts((data as any) ?? []);
  }

  async function loadExercisesAll() {
    const { data } = await supabase
      .from("exercises")
      .select("id,name,is_global")
      .order("is_global", { ascending: false })
      .order("name");
    setExercises((data as any) ?? []);
  }

  async function loadExercisesForPart(partId: string) {
    const { data } = await supabase
      .from("exercises")
      .select("id,name,is_global,exercise_body_parts!inner(body_part_id)")
      .eq("exercise_body_parts.body_part_id", partId)
      .order("is_global", { ascending: false })
      .order("name");
    setExercises(((data as any) ?? []).map((d: any) => ({ id: d.id, name: d.name, is_global: d.is_global })));
  }

  async function loadExercisesUncategorized() {
    const { data } = await supabase
      .from("exercises")
      .select("id,name,is_global,exercise_body_parts(body_part_id)")
      .is("exercise_body_parts.body_part_id", null)
      .order("is_global", { ascending: false })
      .order("name");
    setExercises(((data as any) ?? []).map((d: any) => ({ id: d.id, name: d.name, is_global: d.is_global })));
  }

  // Suggested = union of exercises for body parts mapped to the split
  async function loadSuggestedPartsForSplit(splitId: string) {
    const { data } = await supabase
      .from("training_splits_body_parts")
      .select("body_part_id, body_parts!inner(id,name,is_global)")
      .eq("split_id", splitId);
    const rows = (data as any) ?? [];
    const unique: Record<string, BodyPartRow> = {};
    for (const r of rows) {
      const bp = r.body_parts;
      if (bp && bp.id) unique[bp.id] = { id: bp.id, name: bp.name, is_global: bp.is_global };
    }
    const list = Object.values(unique);
    setSuggestedParts(list);
    return list;
  }

  async function loadExercisesSuggested(splitId: string) {
    // 1) find body parts for this split
    const partsForSplit = await loadSuggestedPartsForSplit(splitId);
    if (partsForSplit.length === 0) {
      // fallback to All if no mapping yet
      await loadExercisesAll();
      return;
    }

    const partIds = partsForSplit.map((p) => p.id);

    // 2) get exercise_ids linked to any of these body parts
    const { data: mapRows } = await supabase
      .from("exercise_body_parts")
      .select("exercise_id")
      .in("body_part_id", partIds);

    const ids = Array.from(new Set(((mapRows as any) ?? []).map((r: any) => r.exercise_id)));
    if (ids.length === 0) {
      setExercises([]);
      return;
    }

    // 3) fetch exercises by ids
    const { data: exRows } = await supabase
      .from("exercises")
      .select("id,name,is_global")
      .in("id", ids)
      .order("is_global", { ascending: false })
      .order("name");

    setExercises((exRows as any) ?? []);
  }

  // initial load
  useEffect(() => {
    (async () => {
      await Promise.all([loadSplits(), loadBodyParts(), loadExercisesAll()]);
    })();
  }, []);

  // react to chip changes
  useEffect(() => {
    (async () => {
      if (activeChip === CHIP_ALL) {
        await loadExercisesAll();
      } else if (activeChip === CHIP_UNCAT) {
        await loadExercisesUncategorized();
      } else if (activeChip === CHIP_SUGGESTED) {
        if (selectedSplitId) {
          await loadExercisesSuggested(selectedSplitId);
        } else {
          await loadExercisesAll();
        }
      } else {
        await loadExercisesForPart(activeChip);
      }
    })();
  }, [activeChip, selectedSplitId]);

  const filteredExercises = useMemo(() => {
    const q = exSearch.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, exSearch]);

  const selectedSplitName = useMemo(
    () => splits.find((s) => s.id === selectedSplitId)?.name ?? "",
    [splits, selectedSplitId]
  );

  // --------------- Actions ---------------

  function addBlockByExercise(ex: ExerciseRow) {
    const idx = blocks.findIndex((b) => b.exercise_id === ex.id);
    if (idx >= 0) {
      blocksRef.current?.querySelectorAll<HTMLElement>('[data-exblock="true"]')[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBlocks((b) => [...b, { exercise_id: ex.id, exercise_name: ex.name, sets: [{ reps: 0, weight: 0 }] }]);
    setTimeout(() => blocksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function quickAddExercise() {
    if (!newExerciseName.trim()) return;
    setExerciseErr(null);
    const { data, error } = await supabase
      .from("exercises")
      .insert({ name: newExerciseName.trim(), is_global: false })
      .select("*")
      .single();
    if (error) {
      setExerciseErr(error.message);
      return;
    }
    setNewExerciseName("");
    setAddingExercise(false);
    // refresh list according to active chip
    if (activeChip === CHIP_ALL) await loadExercisesAll();
    else if (activeChip === CHIP_UNCAT) await loadExercisesUncategorized();
    else if (activeChip === CHIP_SUGGESTED && selectedSplitId) await loadExercisesSuggested(selectedSplitId);
    else await loadExercisesForPart(activeChip);
    addBlockByExercise(data as any);
  }

  function removeBlock(i: number) {
    setBlocks((b) => b.filter((_, idx) => idx !== i));
  }
  function addSet(i: number) {
    setBlocks((b) => {
      const copy = [...b];
      copy[i].sets.push({ reps: 0, weight: 0 });
      return copy;
    });
  }
  function removeSet(i: number, j: number) {
    setBlocks((b) => {
      const copy = [...b];
      if (copy[i].sets.length > 1) copy[i].sets.splice(j, 1);
      else copy[i].sets[0] = { reps: 0, weight: 0 };
      return copy;
    });
  }
  function updateSet(i: number, j: number, key: "reps" | "weight", val: number) {
    setBlocks((b) => {
      const copy = [...b];
      copy[i].sets[j][key] = val;
      return copy;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!selectedSplitId && !selectedSplitName) {
      setMessage("Pick a training day.");
      return;
    }
    if (blocks.length === 0) {
      setMessage("Add at least one exercise.");
      return;
    }
    setSaving(true);

    const payloadBlocks = blocks.map((b) => ({
      exercise_id: b.exercise_id,
      exercise_name: b.exercise_name,
      sets: b.sets,
    }));

    const volume = computeVolume(payloadBlocks.map((blk: any) => ({ sets: blk.sets })));

    const { error } = await supabase.from("workouts").insert({
      name: name || selectedSplitName || "Session",
      day: selectedSplitName || "Custom",
      split_id: selectedSplitId || null,
      sets: payloadBlocks,
      volume,
    });

    setSaving(false);
    if (error) setMessage(error.message);
    else {
      setMessage("Saved!");
      setName("");
      setBlocks([]);
    }
  }

  // --------------- UI helpers ---------------

  function Chip({ id, label, active }: { id: string; label: string; active: boolean }) {
    return (
      <button
        type="button"
        onClick={() => setActiveChip(id)}
        className={[
          "px-3 py-1.5 rounded-full border text-sm transition",
          active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50 border-gray-200"
        ].join(" ")}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  }

  function SplitTile({ split }: { split: SplitRow }) {
    const selected = selectedSplitId === split.id;
    return (
      <button
        type="button"
        onClick={async () => {
          setSelectedSplitId(split.id);
          // When a split is picked, switch to Suggested and load union exercises
          setActiveChip(CHIP_SUGGESTED);
          await loadExercisesSuggested(split.id);
        }}
        className={[
          "group w-full rounded-2xl border p-4 text-left transition hover:shadow-sm",
          selected ? "ring-2 ring-black border-black/10" : "border-gray-200",
          "bg-white/70 backdrop-blur",
        ].join(" ")}
        aria-pressed={selected}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{iconForSplit(split.name)}</span>
          <div className="flex-1">
            <div className="font-medium leading-tight">
              {split.name}
              {split.is_global ? <span className="ml-2 text-xs text-gray-500">(global)</span> : null}
            </div>
            {selected ? <div className="text-xs text-gray-600">Selected</div> : <div className="text-xs text-gray-400">Tap to select</div>}
          </div>
        </div>
      </button>
    );
  }

  function ExerciseTile({ ex }: { ex: ExerciseRow }) {
    const already = blocks.some((b) => b.exercise_id === ex.id);
    return (
      <button
        type="button"
        onClick={() => addBlockByExercise(ex)}
        className={[
          "w-full rounded-xl border p-3 text-left hover:shadow-sm transition",
          already ? "ring-1 ring-black border-black/10 bg-white" : "border-gray-200 bg-white/70",
        ].join(" ")}
        aria-label={`Add ${ex.name}`}
      >
        <div className="text-sm font-medium truncate">{ex.name}</div>
        <div className="text-[11px] text-gray-500 mt-0.5">{ex.is_global ? "Global" : "Personal"}</div>
        {already && <div className="mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded bg-black/5">Added</div>}
      </button>
    );
  }

  // --------------- Render ---------------

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Header */}
      <div>
        <label className="block text-sm mb-1">Workout Name</label>
        <input
          className="w-full border rounded p-2"
          placeholder="Optional (defaults to training day name)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Training Day */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Choose training day</h2>
          {selectedSplitId && (
            <span className="text-xs text-gray-600">
              Suggested: {suggestedParts.length > 0 ? suggestedParts.map((p) => p.name).join(", ") : "—"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {splits.map((s) => <SplitTile key={s.id} split={s} />)}
        </div>
      </section>

      {/* Filter bar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Add exercises</h2>
          <input
            className="border rounded p-2 text-sm w-64"
            placeholder="Search exercises…"
            value={exSearch}
            onChange={(e) => setExSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          <Chip id={CHIP_SUGGESTED} label="Suggested" active={activeChip === CHIP_SUGGESTED} />
          <Chip id={CHIP_ALL} label="All" active={activeChip === CHIP_ALL} />
          <Chip id={CHIP_UNCAT} label="Uncategorized" active={activeChip === CHIP_UNCAT} />
          {parts.map((p) => (
            <Chip key={p.id} id={p.id} label={p.name} active={activeChip === p.id} />
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredExercises.map((ex) => <ExerciseTile key={ex.id} ex={ex} />)}

          {/* New exercise tile */}
          <div className="w-full rounded-xl border border-dashed p-3 bg-white/60">
            {!addingExercise ? (
              <button type="button" className="w-full text-left" onClick={() => setAddingExercise(true)}>
                <div className="text-sm font-medium">+ New exercise</div>
                <div className="text-[11px] text-gray-500">Save to your list</div>
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  className="w-full border rounded p-2"
                  placeholder="e.g., Seated Cable Row"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                />
                <div className="flex gap-2">
                  <button type="button" className="px-3 py-1.5 border rounded" onClick={quickAddExercise}>Add</button>
                  <button type="button" className="px-3 py-1.5 border rounded" onClick={() => { setAddingExercise(false); setNewExerciseName(""); }}>Cancel</button>
                </div>
                {exerciseErr && <p className="text-xs text-red-600">{exerciseErr}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Selected blocks / Sets */}
      <section ref={blocksRef} className="space-y-4">
        {blocks.length > 0 && <h2 className="text-base font-semibold">Sets</h2>}

        {blocks.map((b, i) => (
          <div key={i} data-exblock="true" className="border rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="font-medium">{b.exercise_name || "Exercise"}</div>
              <button type="button" className="text-xs px-2 py-1 border rounded" onClick={() => removeBlock(i)}>
                Remove exercise
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-1.5 pr-4 w-16">Set #</th>
                    <th className="py-1.5 pr-4 w-20">Reps</th>
                    <th className="py-1.5 pr-2 w-28">Weight (kg)</th>
                    <th className="py-1.5 pr-2 w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {b.sets.map((s, j) => (
                    <tr key={j} className="border-b last:border-0">
                      <td className="py-1.5 pr-4">{j + 1}</td>
                      <td className="py-1.5 pr-4">
                        <input
                          type="number"
                          className="w-24 border rounded p-2"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          aria-label={`Set ${j + 1} reps`}
                          value={s.reps}
                          onChange={(e) => updateSet(i, j, "reps", Number(e.target.value))}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          className="w-28 border rounded p-2"
                          min={0}
                          step={0.5}
                          inputMode="decimal"
                          aria-label={`Set ${j + 1} weight`}
                          value={s.weight}
                          onChange={(e) => updateSet(i, j, "weight", Number(e.target.value))}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => removeSet(i, j)}>
                          Remove set
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <button type="button" className="text-sm px-2 py-1 border rounded" onClick={() => addSet(i)}>
                + Add set
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button disabled={saving} className="px-4 py-2 rounded bg-black text-white">
          {saving ? "Saving…" : "Save Workout"}
        </button>
        {message && <span className="text-sm">{message}</span>}
      </div>
    </form>
  );
}
