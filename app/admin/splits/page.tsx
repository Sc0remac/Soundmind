"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Split = { id: string; name: string };
type BodyPart = { id: string; name: string };

export default function AdminSplits() {
  const [splits, setSplits] = useState<Split[]>([]);
  const [parts, setParts] = useState<BodyPart[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const selectSplit = useCallback(async function selectSplit(id: string) {
    setSelected(id);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch(`/api/admin/splits/${id}/body-parts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const map: Record<string, boolean> = {};
    (json.body_part_ids || []).forEach((bp: string) => (map[bp] = true));
    setChecked(map);
  }, []);

  const load = useCallback(async function load() {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;

    const [s, p] = await Promise.all([
      fetch("/api/admin/splits", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch("/api/admin/body-parts", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ]);
    setSplits(s.items || []);
    setParts(p.items || []);
    if (s.items?.[0]?.id) selectSplit(s.items[0].id);
  }, [selectSplit]);

  useEffect(() => { load(); }, [load]);
  

  async function addSplit() {
    const n = name.trim();
    if (!n) return;
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    await fetch("/api/admin/splits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: n }),
    });
    setName("");
    load();
  }

  async function saveMapping() {
    if (!selected) return;
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const body_part_ids = Object.keys(checked).filter((k) => checked[k]);
    await fetch(`/api/admin/splits/${selected}/body-parts`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body_part_ids }),
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Global Splits & Body-Part Mapping</h2>

      <div className="flex gap-4 items-end">
        <input className="border rounded p-2" placeholder="New split…" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="px-3 py-2 border rounded" onClick={addSplit}>Add</button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm text-gray-500">Splits</div>
          <ul className="border rounded divide-y">
            {splits.map((s) => (
              <li
                key={s.id}
                className={`p-3 cursor-pointer ${selected === s.id ? "bg-black/5" : ""}`}
                onClick={() => selectSplit(s.id)}
              >
                {s.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            Body parts mapped to: <span className="font-medium">{splits.find((x) => x.id === selected)?.name ?? "—"}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {parts.map((p) => (
              <label key={p.id} className="flex items-center gap-2 border rounded p-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!checked[p.id]}
                  onChange={(e) => setChecked((c) => ({ ...c, [p.id]: e.target.checked }))}
                />
                <span className="text-sm">{p.name}</span>
              </label>
            ))}
          </div>
          <button className="px-3 py-2 border rounded" onClick={saveMapping} disabled={!selected}>
            Save mapping
          </button>
        </div>
      </div>
    </div>
  );
}
