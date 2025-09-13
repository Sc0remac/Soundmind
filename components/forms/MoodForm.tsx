// components/forms/MoodForm.tsx
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // your existing client
import { Card, CardHeader, CardBody, CardFooter, Button, Chip } from "@nextui-org/react";
import { Brain, Heart, Music2, CalendarDays, Sun, Moon, Smile, Meh, Frown, Clock } from "lucide-react";

const tags = ["Calm", "Focused", "Anxious", "Energised", "Drained", "Stressed", "Optimistic"];

export default function MoodForm() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [mood, setMood] = useState<number>(7);
  const [sleep, setSleep] = useState<number>(7);
  const [stress, setStress] = useState<number>(3);
  const [energy, setEnergy] = useState<number>(7);
  const [labelTags, setLabelTags] = useState<string[]>(["Focused"]);
  const [journal, setJournal] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = (t: string) => setLabelTags((x) => x.includes(t) ? x.filter((y) => y !== t) : [...x, t]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const created_at = new Date(`${date}T${time}:00`);
      const { error } = await supabase.from("moods").insert({
        score: mood,
        energy,
        stress,
        sleep_hours: sleep,
        contexts: labelTags,
        journal,
        created_at,
      });
      if (error) throw error;
      setMessage("Mood saved");
    } catch (err: any) {
      setMessage(err?.message || "Failed to save mood");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 p-2 ring-1 ring-white/20">
            <Brain className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Log Mood</h2>
            <p className="text-xs text-white/60">Quick check-in + optional journal</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Music2 className="size-4" />
          <span>Music correlation comes later</span>
        </div>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm text-white/80"><CalendarDays className="size-4"/>Date</span>
              <input type="date" value={date} onChange={(e)=>setDate(e.target.value)}
                     className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-fuchsia-400/40"/>
            </label>
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm text-white/80"><Clock className="size-4"/>Time</span>
              <input type="time" value={time} onChange={(e)=>setTime(e.target.value)}
                     className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-fuchsia-400/40"/>
            </label>
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm text-white/80"><Heart className="size-4"/>Overall mood ({mood})</span>
              <input type="range" min={1} max={10} value={mood} onChange={(e)=>setMood(Number(e.target.value))}
                     className="accent-fuchsia-400" />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm text-white/80"><Sun className="size-4"/>Energy ({energy})</span>
              <input type="range" min={1} max={10} value={energy} onChange={(e)=>setEnergy(Number(e.target.value))} className="accent-amber-300" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm text-white/80"><Moon className="size-4"/>Sleep hours ({sleep})</span>
              <input type="range" min={0} max={12} value={sleep} onChange={(e)=>setSleep(Number(e.target.value))} className="accent-sky-300" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm text-white/80">Stress ({stress})</span>
              <input type="range" min={0} max={10} value={stress} onChange={(e)=>setStress(Number(e.target.value))} className="accent-rose-400" />
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-white/80">Tags</div>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Chip key={t} onClick={()=>toggle(t)} variant="flat" className={labelTags.includes(t)?"bg-fuchsia-500/20":"bg-white/5"}>{t}</Chip>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-white/80">Journal (optional)</span>
            <textarea
              value={journal}
              onChange={(e)=>setJournal(e.target.value)}
              rows={4}
              placeholder="What influenced your mood today?"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-fuchsia-400/40"
            />
          </label>

          <CardFooter className="flex items-center justify-end">
            <Button color="secondary" type="submit" isLoading={loading}>Save mood</Button>
          </CardFooter>
          {message && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/90">{message}</div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}
