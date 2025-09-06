import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const v = await requireAdminFromRequest(req);
  if (!v.ok) return NextResponse.json({ error: v.message }, { status: v.status });

  const { data } = await supabaseAdmin
    .from("training_splits")
    .select("id,name,is_global,created_at")
    .eq("is_global", true)
    .order("name");
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const v = await requireAdminFromRequest(req);
  if (!v.ok) return NextResponse.json({ error: v.message }, { status: v.status });

  const body = await req.json();
  const name = (body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("training_splits")
    .insert({ name, is_global: true })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: Request) {
  const v = await requireAdminFromRequest(req);
  if (!v.ok) return NextResponse.json({ error: v.message }, { status: v.status });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("training_splits").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
