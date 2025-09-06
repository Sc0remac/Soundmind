"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ManageExercisesPage() {
  const [exs, setExs] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("is_global", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) setErr(error.message);
    setExs(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function addExercise() {
    if (!name.trim()) return;
    setErr(null);
    const { error } = await supabase
      .from("exercises")
      .insert({ name, is_global: false });
    if (error) setErr(error.message);
    setName("");
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Manage Exercises</h1>
      <div className="flex gap-2">
        <input
          className="border rounded p-2"
          placeholder="Exercise (e.g., Barbell Bench Press)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="px-3 py-2 border rounded" onClick={addExercise}>Add</button>
      </div>
      {err && <p className="text-red-600">{err}</p>}
      <ul className="space-y-1">
        {exs.map((x) => (
          <li key={x.id} className="text-sm">
            {x.name} {x.is_global ? <span className="text-gray-500">(global)</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
