import { NextResponse } from "next/server";
import { isObservabilityAdmin } from "@/lib/observability-admin";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ allowed: false }, { status: 401 });
  }

  return NextResponse.json(
    { allowed: isObservabilityAdmin(user.email) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
