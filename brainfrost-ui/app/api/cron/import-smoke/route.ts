import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveManagedLlmConfig } from "@/lib/managed-llm-config";
import { sanitizeTelemetryMessage, writeErrorTelemetry } from "@/lib/error-telemetry";
import { EXTRACTION_SYSTEM_PROMPT, parseSuggestionsJson } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const SMOKE_INPUT = `
Projeto de teste sintético do BrainFrost.
Commits usam Conventional Commits, têm no máximo 150 caracteres e não incluem
Co-Authored-By de ferramentas de IA. Datas são persistidas em UTC. A equipe gosta
de café às terças-feiras, mas isso não é uma regra de engenharia.
CAMADAS EXISTENTES: (nenhuma camada existente; não sugira links)
`;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const startedAt = Date.now();
  const admin = getSupabaseAdmin();
  const managed = resolveManagedLlmConfig(process.env);
  if (!managed || managed.provider !== "openrouter") {
    return NextResponse.json({ error: "provedor gerenciado incompatível com o smoke test" }, { status: 503 });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${managed.apiKey}`,
        "content-type": "application/json",
        "http-referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://brainfrost.vercel.app",
        "x-title": "BrainFrost synthetic check",
      },
      body: JSON.stringify({
        model: managed.model,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: SMOKE_INPUT },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
        max_tokens: Math.min(managed.maxOutputTokens, 1_000),
      }),
    });
    const payload = await response.json().catch(() => null) as {
      choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
      error?: { message?: string };
    } | null;
    if (!response.ok) throw new Error(payload?.error?.message ?? `OpenRouter respondeu ${response.status}`);
    if (payload?.choices?.[0]?.finish_reason === "length") throw new Error("resposta truncada");

    const suggestions = parseSuggestionsJson(payload?.choices?.[0]?.message?.content ?? "");
    if (suggestions.length < 1 || suggestions.length > 5) {
      throw new Error(`quantidade inesperada de sugestões: ${suggestions.length}`);
    }
    if (suggestions.some((item) => !item.title || !item.body)) {
      throw new Error("sugestão sem título ou corpo");
    }

    const durationMs = Date.now() - startedAt;
    await admin.from("synthetic_checks").insert({
      check_name: "managed-import-analysis",
      status: "ok",
      duration_ms: durationMs,
      provider: managed.provider,
      suggestions_count: suggestions.length,
    });
    console.info("[brainfrost_smoke]", JSON.stringify({ status: "ok", durationMs, suggestions: suggestions.length }));
    return NextResponse.json({ ok: true, durationMs, suggestions: suggestions.length });
  } catch (error) {
    const errorId = crypto.randomUUID();
    const message = sanitizeTelemetryMessage(error);
    const durationMs = Date.now() - startedAt;
    writeErrorTelemetry({ errorId, scope: "synthetic", stage: "managed_import", message, provider: managed.provider });
    await Promise.all([
      admin.from("error_events").insert({
        error_id: errorId,
        scope: "synthetic",
        stage: "managed_import",
        provider: managed.provider,
        message,
        metadata: { durationMs },
      }),
      admin.from("synthetic_checks").insert({
        check_name: "managed-import-analysis",
        status: "error",
        duration_ms: durationMs,
        provider: managed.provider,
        error_id: errorId,
      }),
    ]);
    return NextResponse.json({ error: "teste sintético falhou", errorId }, { status: 502 });
  }
}
