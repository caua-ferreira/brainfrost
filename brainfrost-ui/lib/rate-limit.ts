import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof getSupabaseServer>>;

export async function enforceRateLimit(
  supabase: SupabaseServer,
  bucket: string,
  limit: number,
  windowSeconds: number
) {
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rate_limit]", bucket, error.message);
    return NextResponse.json(
      { error: "Não foi possível validar o limite de uso. Tente novamente." },
      { status: 503 }
    );
  }

  const result = data?.[0];
  if (!result?.allowed) {
    const retryAfter = result?.resets_at
      ? Math.max(1, Math.ceil((new Date(result.resets_at).getTime() - Date.now()) / 1000))
      : windowSeconds;
    return NextResponse.json(
      { error: "Muitas solicitações em pouco tempo. Aguarde um instante e tente novamente." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  return null;
}

