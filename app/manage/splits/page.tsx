"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ManageSplitsPage() {
  const [splits, setSplits] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("training_splits")
      .select("*")
      .order("is_global", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) setErr(error.message);
    setSplits(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function addSplit() {
    if (!name.trim()) return;
    setErr(null);
    const { error } = await supabase.from("training_splits").insert({ name, is_global: false });
    if (error) setErr(error.message);
    setName("");
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Manage Splits</h1>
      <div className="flex gap-2">
        <input
          className="border rounded p-2"
          placeholder="Split name (e.g., Arms)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="px-3 py-2 border rounded" onClick={addSplit}>Add</button>
      </div>
      {err && <p className="text-red-600">{err}</p>}
      <ul className="space-y-1">
        {splits.map((s) => (
          <li key={s.id} className="text-sm">
            {s.name} {s.is_global ? <span className="text-gray-500">(global)</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
