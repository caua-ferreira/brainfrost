import { NextResponse } from "next/server";
import { hasProAccess } from "@/lib/pro-entitlement";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSupabaseServer } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { sanitize } from "@/lib/sanitize";
import { resolveManagedLlmConfig } from "@/lib/managed-llm-config";
import { sanitizeTelemetryMessage, writeErrorTelemetry } from "@/lib/error-telemetry";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionInput,
  isCategory,
  parseSuggestionsJson,
  type LlmSuggestion,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

type Provider = "claude" | "gemini";

async function reportAnalysisError(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  input: {
  stage: string;
  message: unknown;
  userId: string;
  importId: string;
  provider?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}) {
  const errorId = crypto.randomUUID();
  const message = sanitizeTelemetryMessage(input.message);
  const metadata = Object.fromEntries(
    Object.entries(input.metadata ?? {}).filter(([, value]) => value !== undefined)
  );
  writeErrorTelemetry({ errorId, scope: "analysis", ...input, message, metadata });
  await supabase.from("error_events").insert({
    error_id: errorId,
    user_id: input.userId,
    import_id: input.importId,
    scope: "analysis",
    stage: input.stage,
    provider: input.provider ?? null,
    message,
    metadata,
  });
  return errorId;
}

async function callClaude(
  apiKey: string,
  userText: string,
  model?: string,
  maxTokens = 2000,
  signal?: AbortSignal
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: model ?? process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userText }],
  }, { signal });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

async function callGemini(
  apiKey: string,
  userText: string,
  modelName?: string,
  maxOutputTokens = 2000,
  signal?: AbortSignal
): Promise<string> {
  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({
    model: modelName ?? process.env.GEMINI_MODEL ?? "gemini-flash-latest",
    systemInstruction: EXTRACTION_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: "application/json", maxOutputTokens },
  });
  const result = await model.generateContent(userText, { signal });
  return result.response.text();
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  userText: string,
  maxTokens: number,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "http-referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://brainfrost.vercel.app",
      "x-title": "BrainFrost",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
    }),
    signal,
  });
  const payload = await response.json().catch(() => null) as {
    choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `OpenRouter respondeu ${response.status}`);
  }
  const choice = payload?.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new Error("A resposta da IA foi interrompida pelo limite de saída. Tente analisar novamente.");
  }
  return choice?.message?.content ?? "";
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: importId } = await ctx.params;

  const body = await request.json().catch(() => ({}));
  const forceManaged = body?.provider === "managed";
  const browserFallback = body?.provider === "browser-fallback" || forceManaged;
  const providerPref: Provider | null =
    body?.provider === "claude" || body?.provider === "gemini" ? body.provider : null;

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const limited = await enforceRateLimit(supabase, "analyze-import", 20, 3600);
  if (limited) return limited;

  const { data: imp } = await supabase.from("imports").select("*").eq("id", importId).maybeSingle();
  if (!imp) return NextResponse.json({ error: "import não encontrado" }, { status: 404 });
  if (!imp.raw_text) {
    return NextResponse.json({ error: "import sem conteúdo (raw_text vazio)" }, { status: 400 });
  }
  if (imp.status === "pronto") {
    return NextResponse.json({ ok: true, alreadyAnalyzed: true });
  }

  const [{ data: subscription }, { data: grant }] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
    supabase.from("pro_grants").select("expires_at,revoked_at").eq("user_id", user.id).maybeSingle(),
  ]);
  const isPro = hasProAccess(subscription?.status, grant);

  const { data: creds } = await supabase
    .from("llm_credentials")
    .select("provider, api_key_cipher, updated_at")
    .order("updated_at", { ascending: false });

  const sanitized = sanitize(imp.raw_text);
  const chosen = creds && creds.length > 0
    ? (providerPref && creds.find((c) => c.provider === providerPref)) ??
      creds.find((c) => c.provider === "claude") ??
      creds[0]
    : null;

  if (!browserFallback && !chosen) {
    return NextResponse.json(
      { error: "nenhuma chave de LLM configurada — vá em /config" },
      { status: 400 }
    );
  }
  if (!browserFallback && !isPro) {
    return NextResponse.json({ error: "Claude e Gemini são recursos do plano Pro." }, { status: 402 });
  }

  // A escolha explícita "managed" sempre usa a franquia BrainFrost. No
  // fallback automático, contas Pro ainda priorizam a própria chave salva.
  const useUserCredential = !!chosen && !forceManaged && (!browserFallback || isPro);
  let userApiKey: string | null = null;
  if (useUserCredential) {
    try {
      userApiKey = decrypt(Buffer.from(chosen.api_key_cipher, "base64"));
    } catch {
      return NextResponse.json({ error: "falha ao decifrar chave — reconfigure em /config" }, { status: 500 });
    }
  }
  const managed = useUserCredential ? null : resolveManagedLlmConfig(process.env);
  if (!userApiKey && !managed) {
    return NextResponse.json(
      { error: "análise compatível com este navegador ainda não foi configurada" },
      { status: 503 }
    );
  }

  if (managed && isPro) {
    const { data: quotaRows, error: quotaError } = await supabase.rpc("consume_managed_llm_quota");
    if (quotaError) {
      const errorId = await reportAnalysisError(supabase, {
        stage: "quota",
        message: quotaError.message,
        userId: user.id,
        importId,
        provider: managed.provider,
      });
      return NextResponse.json(
        {
          error: "Não foi possível verificar sua franquia de análises. Tente novamente em instantes.",
          errorId,
        },
        { status: 503 }
      );
    }

    const quota = quotaRows?.[0];
    if (!quota?.allowed) {
      return NextResponse.json(
        {
          error: `Você usou as ${quota?.quota_limit ?? 30} análises mensais incluídas no Pro. Cadastre sua própria chave de IA em Configurações para continuar sem limite.`,
          code: "MANAGED_LLM_QUOTA_EXCEEDED",
          usage: quota
            ? { used: quota.used, limit: quota.quota_limit, resetsAt: quota.resets_at }
            : undefined,
        },
        { status: 402 }
      );
    }
  }

  const { data: existingNotes } = await supabase
    .from("vault_notes")
    .select("slug, title, category")
    .order("updated_at", { ascending: false })
    .limit(200);
  const analysisInput = buildExtractionInput(sanitized.cleanText, existingNotes ?? []);

  let raw: string;
  const provider = userApiKey ? chosen!.provider as Provider : managed!.provider;
  try {
    if (userApiKey) {
      raw = provider === "claude"
        ? await callClaude(userApiKey, analysisInput, undefined, 2000, request.signal)
        : await callGemini(userApiKey, analysisInput, undefined, 2000, request.signal);
    } else if (managed!.provider === "claude") {
      raw = await callClaude(
        managed!.apiKey,
        analysisInput,
        managed!.model,
        managed!.maxOutputTokens,
        request.signal
      );
    } else if (managed!.provider === "gemini") {
      raw = await callGemini(
        managed!.apiKey,
        analysisInput,
        managed!.model,
        managed!.maxOutputTokens,
        request.signal
      );
    } else {
      raw = await callOpenRouter(
        managed!.apiKey,
        managed!.model,
        analysisInput,
        managed!.maxOutputTokens,
        request.signal
      );
    }
  } catch (e) {
    if (request.signal.aborted || (e instanceof Error && e.name === "AbortError")) {
      return new Response(null, { status: 499 });
    }
    const msg = e instanceof Error ? e.message : "erro no LLM";
    const errorId = await reportAnalysisError(supabase, {
      stage: "provider",
      message: msg,
      userId: user.id,
      importId,
      provider,
    });
    const publicMessage = msg.includes("interrompida pelo limite")
      ? msg
      : "A IA não conseguiu concluir a análise. Tente novamente em instantes.";
    await supabase
      .from("imports")
      .update({ status: "erro", error: `${sanitizeTelemetryMessage(msg, 300)} [${errorId}]` })
      .eq("id", importId);
    return NextResponse.json({ error: publicMessage, errorId }, { status: 502 });
  }

  let suggestions: LlmSuggestion[];
  try {
    suggestions = parseSuggestionsJson(raw);
  } catch {
    const errorId = await reportAnalysisError(supabase, {
      stage: "parse",
      message: "LLM não devolveu JSON válido",
      userId: user.id,
      importId,
      provider,
      metadata: {
        responseLength: raw.length,
        hasOpeningBrace: raw.includes("{"),
        hasClosingBrace: raw.includes("}"),
      },
    });
    await supabase
      .from("imports")
      .update({ status: "erro", error: `LLM não devolveu JSON válido [${errorId}]` })
      .eq("id", importId);
    // Não devolvemos `raw` inteiro: em caso patológico o LLM pode ecoar
    // o system prompt ou pedaços de contexto que valem menos vazar.
    return NextResponse.json(
      { error: "A IA devolveu uma resposta incompleta. Tente analisar novamente.", errorId },
      { status: 502 }
    );
  }

  const rows = suggestions
    .filter((s) => s.title && s.body)
    .map((s) => {
      const concepts = Array.isArray(s.concepts)
        ? s.concepts.filter((concept): concept is string => typeof concept === "string").map((concept) => concept.trim()).filter(Boolean).slice(0, 5)
        : [];
      const suggestedLinks = Array.isArray(s.links)
        ? s.links
            .filter((link) => link && typeof link.slug === "string" && existingNotes?.some((note) => note.slug === link.slug))
            .slice(0, 5)
            .map((link) => ({ slug: link.slug, reason: typeof link.reason === "string" ? link.reason.slice(0, 240) : null }))
        : [];
      const confidence = typeof s.category_confidence === "number" && Number.isFinite(s.category_confidence)
        ? Math.max(0, Math.min(1, s.category_confidence))
        : null;
      return {
        import_id: importId,
        title: s.title.slice(0, 200),
        body: s.body,
        category: isCategory(s.category) ? s.category : "projeto",
        category_reason: s.category_reason?.slice(0, 300) ?? null,
        category_confidence: confidence,
        concepts,
        suggested_links: suggestedLinks,
        evidence: s.evidence?.slice(0, 200) ?? null,
      };
    });

  const { data: currentImport } = await supabase
    .from("imports")
    .select("status")
    .eq("id", importId)
    .maybeSingle();
  if (request.signal.aborted || currentImport?.status === "cancelado") {
    return NextResponse.json({ error: "análise cancelada", code: "ANALYSIS_CANCELLED" }, { status: 409 });
  }

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("pattern_suggestions").insert(rows);
    if (insErr) {
      const errorId = await reportAnalysisError(supabase, {
        stage: "save_suggestions",
        message: insErr.message,
        userId: user.id,
        importId,
        provider,
      });
      return NextResponse.json(
        { error: "Não foi possível salvar as sugestões da análise.", errorId },
        { status: 500 }
      );
    }
  }

  if (request.signal.aborted) {
    await supabase.from("pattern_suggestions").delete().eq("import_id", importId);
    return new Response(null, { status: 499 });
  }

  const { data: finishedImport } = await supabase
    .from("imports")
    .update({
      status: "pronto",
      finished_at: new Date().toISOString(),
      provider_used: managed ? `brainfrost:${managed.provider}` : provider,
    })
    .eq("id", importId)
    .eq("status", "analisando")
    .select("id")
    .maybeSingle();

  if (!finishedImport) {
    await supabase.from("pattern_suggestions").delete().eq("import_id", importId);
    return NextResponse.json({ error: "análise cancelada", code: "ANALYSIS_CANCELLED" }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    provider: managed ? `brainfrost:${managed.provider}` : provider,
    suggestionsCreated: rows.length,
    redactions: sanitized.redactions,
  });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: importId } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { data: cancelledImport, error } = await supabase
    .from("imports")
    .update({ status: "cancelado", error: null, finished_at: new Date().toISOString() })
    .eq("id", importId)
    .eq("status", "analisando")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "não foi possível cancelar a categorização" }, { status: 503 });
  if (!cancelledImport) return NextResponse.json({ error: "esta categorização já foi concluída" }, { status: 409 });

  await supabase.from("pattern_suggestions").delete().eq("import_id", importId);
  return NextResponse.json({ ok: true });
}
