"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardBody, CardHeader, Button } from "@nextui-org/react";
import { User as UserIcon, Music2, Activity, Brain, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [workoutCount, setWorkoutCount] = useState<number>(0);
  const [moodCount, setMoodCount] = useState<number>(0);
  const [spotifyConnected, setSpotifyConnected] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);

      const { count: wc } = await supabase.from("workouts").select("id", { count: "exact", head: true });
      const { count: mc } = await supabase.from("moods").select("id", { count: "exact", head: true });
      setWorkoutCount(wc || 0);
      setMoodCount(mc || 0);

      const { data: sp } = await supabase.from("profiles").select("spotify_connected").single();
      setSpotifyConnected(Boolean(sp?.spotify_connected));
    })();
  }, []);

  // After OAuth redirect (?spotify=connected) attach tokens, sync and enrich
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("spotify") === "connected") {
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
        try {
          await fetch("/api/spotify/my/attach", { method: "POST", headers });
          await fetch("/api/spotify/my/sync", { method: "POST", headers });
          await fetch("/api/enrich/run", { method: "POST", headers });
          setSpotifyConnected(true);
        } finally {
          url.searchParams.delete("spotify");
          window.history.replaceState({}, "", url.toString());
        }
      })();
    }
  }, []);

  const disconnectSpotify = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
    await fetch("/api/spotify/my/disconnect", { method: "POST", headers });
    setSpotifyConnected(false);
  };

  return (
    <main className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card className="border border-white/10 bg-white/5">
        <CardHeader className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 p-2 ring-1 ring-white/20">
            <UserIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Account</h2>
            <p className="text-xs text-white/60">Email, connections, stats</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/70">Signed in as</div>
            <div className="text-sm font-medium">{userEmail ?? "—"}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm text-white/70"><Activity className="size-4"/>Workouts</div>
              <div className="text-2xl font-semibold">{workoutCount}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm text-white/70"><Brain className="size-4"/>Moods</div>
              <div className="text-2xl font-semibold">{moodCount}</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-white/70"><Music2 className="size-4"/>Spotify</div>
            {spotifyConnected ? (
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-emerald-200 ring-1 ring-emerald-400/30">
                  <CheckCircle2 className="size-4"/> Connected
                </div>
                <Button variant="flat" color="danger" onPress={disconnectSpotify}>Disconnect</Button>
              </div>
            ) : (
              <Button as={Link} href="/api/spotify/start" variant="flat" color="success">Connect Spotify</Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card className="border border-white/10 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20">
        <CardHeader>
          <h2 className="text-lg font-semibold">Shortcuts</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button as={Link} href="/workout/new" variant="flat" startContent={<Activity className="size-4"/>}>Log workout</Button>
          <Button as={Link} href="/mood/new" variant="flat" startContent={<Brain className="size-4"/>}>Log mood</Button>
          <Button as={Link} href="/timeline" variant="flat">Timeline</Button>
          <Button as={Link} href="/insights" variant="flat">Insights</Button>
        </CardBody>
      </Card>
    </main>
  );
}