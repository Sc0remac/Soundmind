// app/timeline/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Chip, Divider, Button } from "@nextui-org/react";
import { supabase } from "@/lib/supabaseClient";
import { Dumbbell, Smile } from "lucide-react";

type Workout = {
  id: string; started_at: string; split_name: string | null; volume: number | null; name: string;
};
type Mood = { id: string; created_at: string; score: number; post_workout: boolean | null; energy: number | null; stress: number | null };

type FeedItem =
  | { type: "workout"; at: string; w: Workout }
  | { type: "mood"; at: string; m: Mood };

function groupByDate(items: FeedItem[]) {
  const map = new Map<string, FeedItem[]>();
  for (const it of items) {
    const d = new Date(it.at);
    const key = isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString();
    map.set(key, [...(map.get(key)||[]), it]);
  }
  return [...map.entries()].sort((a,b)=> new Date(b[0]).getTime() - new Date(a[0]).getTime());
}

export default function TimelinePage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: ws }, { data: ms }] = await Promise.all([
        supabase.from("workouts").select("id,started_at,split_name,volume,name").order("started_at", { ascending: false }).limit(200),
        supabase.from("moods").select("id,created_at,score,post_workout,energy,stress").order("created_at", { ascending: false }).limit(200),
      ]);
      const wItems: FeedItem[] = (ws||[]).map((w)=>({ type:"workout", at: w.started_at, w }));
      const mItems: FeedItem[] = (ms||[]).map((m)=>({ type:"mood", at: m.created_at, m }));
      setFeed([...wItems, ...mItems].sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime()));
      setLoading(false);
    })();
  }, []);

  const groups = useMemo(()=>groupByDate(feed), [feed]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <Button as="a" href="/insights" size="sm" variant="flat" color="primary">See insights</Button>
      </div>

      {groups.map(([date, items])=>(
        <Card key={date} className="shadow-card">
          <CardHeader className="justify-between">
            <div className="font-medium">{date}</div>
            <Chip variant="flat">{items.length} entries</Chip>
          </CardHeader>
          <Divider/>
          <CardBody className="space-y-3">
            {items.map((it, idx)=>(
              <div key={idx} className="flex items-center gap-3 text-sm">
                {it.type==="workout" ? (
                  <>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Dumbbell size={16}/>
                    </span>
                    <span className="font-medium">{it.w.name}</span>
                    <span className="text-gray-500">· {it.w.split_name || "—"}</span>
                    <span className="text-gray-500">· vol {Math.round(it.w.volume||0)}</span>
                    <span className="ml-auto text-gray-500">{new Date(it.at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                      <Smile size={16}/>
                    </span>
                    <span>Mood {it.m.score}/10</span>
                    {it.m.post_workout ? <Chip size="sm" variant="flat" color="success">post-workout</Chip> : null}
                    <span className="text-gray-500">· energy {it.m.energy ?? "—"}</span>
                    <span className="text-gray-500">· stress {it.m.stress ?? "—"}</span>
                    <span className="ml-auto text-gray-500">{new Date(it.at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>
                  </>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      ))}

      {!groups.length && !loading && (
        <Card className="shadow-card"><CardBody>
          <div className="text-sm text-gray-600">No entries yet. Log a workout or mood to get started.</div>
        </CardBody></Card>
      )}
    </div>
  );
}
