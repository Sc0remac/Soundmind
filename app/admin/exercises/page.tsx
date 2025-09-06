"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = { id: string; name: string; is_global: boolean };

export default function AdminExercises() {
  const [items, setItems] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/admin/exercises", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { items } = await res.json();
      setItems(items);
    }
  }

  useEffect(() => { load(); }, []);

  async function add() {
    setErr(null);
    const n = name.trim();
    if (!n) return;
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch("/api/admin/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: n }),
    });
    if (!res.ok) setErr((await res.json()).error || "Error");
    setName("");
    load();
  }

  async function remove(id: string) {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    await fetch("/api/admin/exercises", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Global Exercises</h2>
      <div className="flex gap-2">
        <input className="border rounded p-2" placeholder="New exercise…" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="px-3 py-2 border rounded" onClick={add}>Add</button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => (
          <li key={r.id} className="border rounded p-3 flex items-center justify-between">
            <span>{r.name}</span>
            <button className="text-xs px-2 py-1 border rounded" onClick={() => remove(r.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
