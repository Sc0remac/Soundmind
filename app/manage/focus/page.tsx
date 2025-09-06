"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ManageFocusPage() {
  const [splits, setSplits] = useState<any[]>([]);
  const [splitId, setSplitId] = useState<string>("");
  const [focusRows, setFocusRows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function loadSplits() {
    const { data, error } = await supabase
      .from("training_splits")
      .select("id,name,is_global")
      .order("is_global", { ascending: false })
      .order("name", { ascending: true });
    if (!error && data) setSplits(data);
  }

  async function loadFocus(sid: string) {
    if (!sid) { setFocusRows([]); return; }
    const { data, error } = await supabase
      .from("training_focus")
      .select("*")
      .eq("split_id", sid)
      .order("is_global", { ascending: false })
      .order("name", { ascending: true });
    if (error) setErr(error.message);
    setFocusRows(data ?? []);
  }

  useEffect(() => { loadSplits(); }, []);
  useEffect(() => { loadFocus(splitId); }, [splitId]);

  const splitName = useMemo(() => splits.find(s => s.id === splitId)?.name ?? "", [splitId, splits]);

  async function addFocus() {
    if (!splitId || !name.trim()) return;
    setErr(null);
    const { error } = await supabase.from("training_focus").insert({
      split_id: splitId,
      name,
      is_global: false
    });
    if (error) setErr(error.message);
    setName("");
    loadFocus(splitId);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Manage Focus</h1>

      <div className="flex gap-2 items-center">
        <select
          className="border rounded p-2"
          value={splitId}
          onChange={(e) => setSplitId(e.target.value)}
        >
          <option value="">— choose split —</option>
          {splits.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.is_global ? " (global)" : ""}
            </option>
          ))}
        </select>
        {splitName && <span className="text-sm text-gray-600">Selected: {splitName}</span>}
      </div>

      <div className="flex gap-2">
        <input
          className="border rounded p-2"
          placeholder="Focus name (e.g., Chest)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="px-3 py-2 border rounded" onClick={addFocus} disabled={!splitId}>
          Add
        </button>
      </div>

      {err && <p className="text-red-600">{err}</p>}

      <ul className="space-y-1">
        {focusRows.map((f) => (
          <li key={f.id} className="text-sm">
            {f.name} {f.is_global ? <span className="text-gray-500">(global)</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
