// app/log-mood/page.tsx
"use client";

import { useState } from "react";
import {
  Card, CardBody, CardHeader, Button, Textarea, Slider, Switch, Chip,
} from "@nextui-org/react";
import { supabase } from "@/lib/supabaseClient";

export default function LogMoodPage() {
  const [score, setScore] = useState<number>(7);
  const [postWorkout, setPostWorkout] = useState<boolean>(true);
  const [journal, setJournal] = useState("");
  const [energy, setEnergy] = useState<number>(6);
  const [stress, setStress] = useState<number>(3);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | "err">(null);

  async function onSave() {
    setSaving(true); setSaved(null);
    try {
      const payload = {
        score, journal: journal || null, post_workout: postWorkout,
        energy, stress,
      };
      const { error } = await supabase.from("moods").insert(payload);
      if (error) throw error;
      setSaved("ok");
      setJournal("");
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
        <h1 className="text-2xl font-semibold">Log Mood</h1>
        <Chip color={saved==="ok" ? "success" : "danger"} variant="flat" className={saved? "opacity-100" : "opacity-0"}>
          {saved==="ok" ? "Saved" : "Error"}
        </Chip>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div>
            <div className="text-sm text-gray-600">How are you feeling?</div>
            <div className="text-3xl font-semibold">{score}/10</div>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          <Slider label="Mood" step={1} minValue={1} maxValue={10} value={score} onChange={(v)=>setScore(Number(v))} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Slider label="Energy" step={1} minValue={0} maxValue={10} value={energy} onChange={(v)=>setEnergy(Number(v))}/>
            <Slider label="Stress" step={1} minValue={0} maxValue={10} value={stress} onChange={(v)=>setStress(Number(v))}/>
          </div>
          <div className="flex items-center justify-between">
            <Switch isSelected={postWorkout} onValueChange={setPostWorkout}>
              This is **after** a workout
            </Switch>
            <Button color="primary" isLoading={saving} onPress={onSave}>Save mood</Button>
          </div>
          <Textarea
            label="Journal (optional)"
            placeholder="Anything notable about sleep, recovery, music, or context?"
            minRows={3}
            value={journal}
            onValueChange={setJournal}
          />
        </CardBody>
      </Card>
    </div>
  );
}
