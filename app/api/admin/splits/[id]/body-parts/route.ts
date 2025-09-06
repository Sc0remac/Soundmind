import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const v = await requireAdminFromRequest(req);
  if (!v.ok) return NextResponse.json({ error: v.message }, { status: v.status });

  const splitId = params.id;
  const { data } = await supabaseAdmin
    .from("training_splits_body_parts")
    .select("body_part_id")
    .eq("split_id", splitId)
    .eq("is_global", true);

  return NextResponse.json({ body_part_ids: (data ?? []).map((r) => r.body_part_id) });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const v = await requireAdminFromRequest(req);
  if (!v.ok) return NextResponse.json({ error: v.message }, { status: v.status });

  const splitId = params.id;
  const { body_part_ids } = await req.json();
  if (!Array.isArray(body_part_ids)) {
    return NextResponse.json({ error: "body_part_ids must be an array" }, { status: 400 });
  }

  // Replace global mappings for this split
  await supabaseAdmin
    .from("training_splits_body_parts")
    .delete()
    .eq("split_id", splitId)
    .eq("is_global", true);

  if (body_part_ids.length > 0) {
    const rows = body_part_ids.map((bp: string) => ({
      split_id: splitId,
      body_part_id: bp,
      is_global: true,
    }));
    const { error } = await supabaseAdmin.from("training_splits_body_parts").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
