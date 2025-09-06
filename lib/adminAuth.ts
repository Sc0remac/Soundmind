import { supabaseAdmin } from "./supabaseAdmin";

export async function requireAdminFromRequest(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { ok: false, status: 401, message: "Missing bearer token" };

  // Verify the token & get user
  const { data: udata, error: uerr } = await supabaseAdmin.auth.getUser(token);
  if (uerr || !udata?.user) return { ok: false, status: 401, message: "Invalid token" };

  // Check admin flag via profiles
  const { data: prof, error: perr } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", udata.user.id)
    .single();

  if (perr || !prof?.is_admin) return { ok: false, status: 403, message: "Forbidden" };

  return { ok: true, userId: udata.user.id };
}
