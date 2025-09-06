import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const c = cookies();
  return NextResponse.json({
    origin: new URL(req.url).origin,
    cookies: {
      sp_access_token_tmp: !!c.get("sp_access_token_tmp"),
      sp_refresh_token_tmp: !!c.get("sp_refresh_token_tmp"),
      sp_scope_tmp: c.get("sp_scope_tmp")?.value || null,
      sp_expires_in_tmp: c.get("sp_expires_in_tmp")?.value || null,
      sp_user_tmp: c.get("sp_user_tmp")?.value || null,
    },
  });
}
