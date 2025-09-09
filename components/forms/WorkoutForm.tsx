// components/forms/WorkoutForm.tsx
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // your existing client
import { Card, CardHeader, CardBody, CardFooter, Button, Chip } from "@nextui-org/react";
import { Dumbbell, Activity, Flame, CalendarDays, Plus, Minus, Clock } from "lucide-react";

const muscleGroups = [
  "Chest",
  "Back",
  "Legs",
  "Shoulders",
  "Arms",
  "Core",
  "Full Body",
];

const templates: Record<string, { name: string; exercises: string[] }> = {
  PUSH: { name: "Push", exercises: ["Bench Press", "Incline DB Press", "Cable Fly", "Triceps Pushdown"] },
  PULL: { name: "Pull", exercises: ["Deadlift", "Lat Pulldown", "Seated Row", "Face Pull"] },
  LEGS: { name: "Legs", exercises: ["Squat", "RDL", "Leg Press", "Leg Curl"] },
  UPPER: { name: "Upper", exercises: ["Bench Press", "Pull-ups", "OHP", "Row"] },
  LOWER: { name: "Lower", exercises: ["Back Squat", "RDL", "Calf Raise", "Leg Curl"] },
};

export default function WorkoutForm() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [title, setTitle] = useState<string>("Training Session");
  const [muscles, setMuscles] = useState<string[]>(["Full Body"]);
  const [notes, setNotes] = useState<string>("");

  type Row = { exercise: string; sets: number; reps: number; weight: number };
  const [rows, setRows] = useState<Row[]>([
    { exercise: "Bench Press", sets: 3, reps: 5, weight: 60 },
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const applyTemplate = (key: keyof typeof templates) => {
    const t = templates[key];
    setTitle(`${t.name} Day`);
    setRows(t.exercises.map((e) => ({ exercise: e, sets: 3, reps: 8, weight: 0 })));
  };

  const addRow = () => setRows((rs) => [...rs, { exercise: "", sets: 3, reps: 8, weight: 0 }]);
  const removeRow = (idx: number) => setRows((rs) => rs.filter((_, i) => i !== idx));

  const toggleMuscle = (m: string) =>
    setMuscles((curr) => (curr.includes(m) ? curr.filter((x) => x !== m) : [...curr, m]));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const started_at = new Date(`${date}T${time}:00`);

      const { data: w, error: werr } = await supabase
        .from("workouts")
        .insert({
          title,
          notes,
          started_at,
          muscle_groups: muscles,
        })
        .select()
        .single();
      if (werr) throw werr;

      const setsPayload = rows.map((r, order) => ({
        workout_id: w.id,
        exercise: r.exercise || "Exercise",
        set_order: order + 1,
        sets: r.sets,
        reps: r.reps,
        weight: r.weight,
      }));
      const { error: serr } = await supabase.from("workout_sets").insert(setsPayload);
      if (serr) throw serr;

      setMessage("Workout saved");
    } catch (err: any) {
      setMessage(err?.message || "Failed to save workout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 p-2 ring-1 ring-white/20">
            <Dumbbell className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Log Workout</h2>
            <p className="text-xs text-white/60">Track sets, reps, and what you trained</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(templates).map((k) => (
            <Button key={k} size="sm" variant="flat" onPress={() => applyTemplate(k as any)}>
              {templates[k as keyof typeof templates].name}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* meta row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm text-white/80"><CalendarDays className="size-4"/>Date</span>
              <input
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-indigo-400/40"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm text-white/80"><Clock className="size-4"/>Start time</span>
              <input
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-indigo-400/40"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm text-white/80"><Activity className="size-4"/>Title</span>
              <input
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-indigo-400/40"
                placeholder="Push Day, Strength, Hypertrophy…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          </div>

          {/* muscle groups */}
          <div className="space-y-2">
            <div className="text-sm text-white/80">Muscle groups</div>
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map((m) => (
                <Chip
                  key={m}
                  onClick={() => toggleMuscle(m)}
                  className={muscles.includes(m) ? "bg-indigo-500/20" : "bg-white/5"}
                  variant="flat"
                >
                  {m}
                </Chip>
              ))}
            </div>
          </div>

          {/* exercise table */}
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-xs uppercase tracking-wide text-white/60">
              <div className="col-span-6">Exercise</div>
              <div className="col-span-2">Sets</div>
              <div className="col-span-2">Reps</div>
              <div className="col-span-2">Weight</div>
            </div>
            <div className="divide-y divide-white/10">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-2 px-3 py-2">
                  <input
                    className="col-span-6 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm"
                    value={r.exercise}
                    onChange={(e) => setRows((rs) => rs.map((x, idx) => idx === i ? { ...x, exercise: e.target.value } : x))}
                    placeholder="e.g. Bench Press"
                  />
                  <input
                    type="number"
                    className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm"
                    value={r.sets}
                    onChange={(e) => setRows((rs) => rs.map((x, idx) => idx === i ? { ...x, sets: Number(e.target.value) } : x))}
                  />
                  <input
                    type="number"
                    className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm"
                    value={r.reps}
                    onChange={(e) => setRows((rs) => rs.map((x, idx) => idx === i ? { ...x, reps: Number(e.target.value) } : x))}
                  />
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="number"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm"
                      value={r.weight}
                      onChange={(e) => setRows((rs) => rs.map((x, idx) => idx === i ? { ...x, weight: Number(e.target.value) } : x))}
                    />
                    <button type="button" className="rounded-lg p-1 hover:bg-white/10" onClick={() => removeRow(i)}>
                      <Minus className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button type="button" startContent={<Plus className="size-4" />} variant="flat" onPress={addRow}>
            Add exercise
          </Button>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-white/80">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-indigo-400/40"
              placeholder="How did it feel? Any PRs?"
            />
          </label>

          <CardFooter className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Flame className="size-4" />
              <span>Consistency is king.</span>
            </div>
            <Button color="primary" type="submit" isLoading={loading}>
              Save workout
            </Button>
          </CardFooter>

          {message && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/90">
              {message}
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}