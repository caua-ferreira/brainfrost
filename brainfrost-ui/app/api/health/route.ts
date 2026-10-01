import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHECK_AGE_MS = 26 * 60 * 60 * 1000;

export async function GET() {
  const startedAt = Date.now();
  try {
    const admin = getSupabaseAdmin();
    const [{ error: databaseError }, { data: latestCheck, error: checkError }] = await Promise.all([
      admin.from("categories").select("id", { head: true, count: "exact" }).limit(1),
      admin.from("synthetic_checks").select("status,occurred_at").order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (databaseError || checkError) throw databaseError ?? checkError;

    const checkAgeMs = latestCheck ? Date.now() - new Date(latestCheck.occurred_at).getTime() : Number.POSITIVE_INFINITY;
    const healthy = latestCheck?.status === "ok" && checkAgeMs <= MAX_CHECK_AGE_MS;
    return NextResponse.json(
      {
        status: healthy ? "ok" : "degraded",
        database: "ok",
        syntheticAnalysis: latestCheck?.status ?? "missing",
        checkedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      },
      { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[health]", error);
    return NextResponse.json(
      { status: "error", checkedAt: new Date().toISOString(), durationMs: Date.now() - startedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

