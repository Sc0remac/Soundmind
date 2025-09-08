// app/log-workout/page.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Chip,
  Divider,
} from "@nextui-org/react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type SetRow = { reps?: number; weight_kg?: number; rpe?: number };
type ExerciseBlock = { name: string; sets: SetRow[] };

const SPLITS = [
  "Push","Pull","Legs","Upper","Lower","Arms","Back","Full Body",
] as const;

export default function LogWorkoutPage() {
  const [startedAt, setStartedAt] = useState<string>(() => new Date().toISOString().slice(0,16));
  const [splitName, setSplitName] = useState<string>("");
  const [title, setTitle] = useState("Workout");
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([
    { name: "Bench Press", sets: [{ reps: 8, weight_kg: 60 }] },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | "err">(null);

  const volume = useMemo(() => {
    const v = blocks.flatMap(b => b.sets).reduce((acc, s) => acc + (Number(s.reps||0) * Number(s.weight_kg||0)), 0);
    return Math.round(v);
  }, [blocks]);

  function dowLabel(dateIso: string) {
    try {
      const d = new Date(dateIso);
      return d.toLocaleDateString(undefined, { weekday: "long" });
    } catch { return "Unknown"; }
  }

  const addBlock = () => setBlocks(b => [...b, { name: "", sets: [{ }] }]);
  const removeBlock = (idx: number) => setBlocks(b => b.filter((_,i)=>i!==idx));
  const addSet = (bIdx: number) => setBlocks(b => b.map((blk,i) => i===bIdx ? ({...blk, sets: [...blk.sets, {}]}) : blk));
  const removeSet = (bIdx: number, sIdx: number) =>
    setBlocks(b => b.map((blk,i) => i===bIdx ? ({...blk, sets: blk.sets.filter((_,j)=>j!==sIdx)}) : blk));

  async function onSave() {
    setSaving(true); setSaved(null);
    try {
      const setsJson = blocks.map(b => ({ name: b.name, sets: b.sets }));
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const payload = {
        name: title || "Workout",
        day: dowLabel(startedAt),
        sets: setsJson,
        volume,
        split_name: splitName || null,
        started_at: new Date(startedAt).toISOString(),
        training_day: splitName || null,
      };

      const { error } = await supabase.from("workouts").insert(payload);
      if (error) throw error;
      setSaved("ok");
      // reset
      setTitle("Workout");
      setBlocks([{ name: "Squat", sets: [{ reps: 5, weight_kg: 80 }] }]);
    } catch (e) {
      console.error(e);
      setSaved("err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Log Workout</h1>
        <Chip color="success" variant="flat" className={saved==="ok" ? "opacity-100" : "opacity-0"}>Saved</Chip>
      </div>

      <Card className="shadow-card">
        <CardHeader className="justify-between">
          <div className="flex gap-3">
            <Input
              label="Title"
              placeholder="Push Day"
              value={title}
              onValueChange={setTitle}
              className="w-56"
            />
            <Select
              label="Split"
              selectedKeys={splitName ? [splitName] : []}
              onChange={(e) => setSplitName(e.target.value)}
              className="w-48"
              placeholder="Select"
            >
              {SPLITS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </Select>
            <Input
              type="datetime-local"
              label="Start"
              value={startedAt}
              onChange={(e)=>setStartedAt(e.target.value)}
              className="w-60"
            />
          </div>
          <div className="text-sm text-gray-500">Volume: <span className="font-medium">{volume}</span></div>
        </CardHeader>
        <Divider/>
        <CardBody className="space-y-4">
          {blocks.map((blk, idx) => (
            <div key={idx} className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <Input
                  label="Exercise"
                  placeholder="e.g., Bench Press"
                  value={blk.name}
                  onValueChange={(v)=>setBlocks(b=>b.map((x,i)=>i===idx?{...x, name:v}:x))}
                  className="w-72"
                />
                <Button isIconOnly variant="light" color="danger" onPress={()=>removeBlock(idx)}>
                  <Trash2 size={18}/>
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {blk.sets.map((s, sIdx) => (
                  <div key={sIdx} className="grid grid-cols-3 gap-3">
                    <Input
                      type="number"
                      label="Reps"
                      value={s.reps?.toString() ?? ""}
                      onChange={(e)=>setBlocks(b=>b.map((x,i)=> i===idx ? ({
                        ...x,
                        sets: x.sets.map((y,j)=> j===sIdx? {...y, reps: Number(e.target.value)} : y)
                      }):x))}
                    />
                    <Input
                      type="number"
                      label="Weight (kg)"
                      value={s.weight_kg?.toString() ?? ""}
                      onChange={(e)=>setBlocks(b=>b.map((x,i)=> i===idx ? ({
                        ...x,
                        sets: x.sets.map((y,j)=> j===sIdx? {...y, weight_kg: Number(e.target.value)} : y)
                      }):x))}
                    />
                    <div className="flex items-end gap-2">
                      <Input
                        type="number"
                        label="RPE"
                        value={s.rpe?.toString() ?? ""}
                        onChange={(e)=>setBlocks(b=>b.map((x,i)=> i===idx ? ({
                          ...x,
                          sets: x.sets.map((y,j)=> j===sIdx? {...y, rpe: Number(e.target.value)} : y)
                        }):x))}
                      />
                      <Button isIconOnly variant="flat" color="danger" onPress={()=>removeSet(idx, sIdx)}>
                        <Trash2 size={16}/>
                      </Button>
                    </div>
                  </div>
                ))}
                <Button startContent={<Plus size={16}/>} size="sm" variant="flat" onPress={()=>addSet(idx)}>
                  Add set
                </Button>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <Button startContent={<Plus size={16}/>} onPress={addBlock} variant="bordered">
              Add exercise
            </Button>
            <Button color="primary" className="ml-auto" isLoading={saving} onPress={onSave}>
              Save workout
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-card">
        <CardBody>
          <p className="text-sm text-gray-600">
            Tip: the coach learns faster if you also log your mood after this workout (see “Log Mood”).
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
