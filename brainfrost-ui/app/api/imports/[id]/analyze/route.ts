import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSupabaseServer } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { sanitize } from "@/lib/sanitize";
import { resolveManagedLlmConfig } from "@/lib/managed-llm-config";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionInput,
  isCategory,
  type LlmSuggestion,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

type Provider = "claude" | "gemini";

async function callClaude(apiKey: string, userText: string, model?: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: model ?? process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 2000,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userText }],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

async function callGemini(apiKey: string, userText: string, modelName?: string): Promise<string> {
  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({
    model: modelName ?? process.env.GEMINI_MODEL ?? "gemini-flash-latest",
    systemInstruction: EXTRACTION_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2000 },
  });
  const result = await model.generateContent(userText);
  return result.response.text();
}

async function callOpenRouter(apiKey: string, model: string, userText: string): Promise<string> {
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
      max_tokens: 2000,
    }),
  });
  const payload = await response.json().catch(() => null) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `OpenRouter respondeu ${response.status}`);
  }
  return payload?.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: importId } = await ctx.params;

  const body = await request.json().catch(() => ({}));
  const browserFallback = body?.provider === "browser-fallback";
  const providerPref: Provider | null =
    body?.provider === "claude" || body?.provider === "gemini" ? body.provider : null;

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { data: imp } = await supabase.from("imports").select("*").eq("id", importId).maybeSingle();
  if (!imp) return NextResponse.json({ error: "import não encontrado" }, { status: 404 });
  if (!imp.raw_text) {
    return NextResponse.json({ error: "import sem conteúdo (raw_text vazio)" }, { status: 400 });
  }
  if (imp.status === "pronto") {
    return NextResponse.json({ ok: true, alreadyAnalyzed: true });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  const isPro = subscription?.status === "active" || subscription?.status === "trialing";

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

  // No fallback, contas Pro usam primeiro a própria chave. O Free usa a
  // credencial gerenciada do BrainFrost e continua protegido pela cota de
  // importações aplicada na criação do import.
  const useUserCredential = !!chosen && (!browserFallback || isPro);
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
        ? await callClaude(userApiKey, analysisInput)
        : await callGemini(userApiKey, analysisInput);
    } else if (managed!.provider === "claude") {
      raw = await callClaude(managed!.apiKey, analysisInput, managed!.model);
    } else if (managed!.provider === "gemini") {
      raw = await callGemini(managed!.apiKey, analysisInput, managed!.model);
    } else {
      raw = await callOpenRouter(managed!.apiKey, managed!.model, analysisInput);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro no LLM";
    await supabase.from("imports").update({ status: "erro", error: msg }).eq("id", importId);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let parsed: { suggestions: LlmSuggestion[] };
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  } catch {
    await supabase
      .from("imports")
      .update({ status: "erro", error: "LLM não devolveu JSON válido" })
      .eq("id", importId);
    // Não devolvemos `raw` inteiro: em caso patológico o LLM pode ecoar
    // o system prompt ou pedaços de contexto que valem menos vazar.
    return NextResponse.json(
      { error: "LLM não devolveu JSON válido", rawPreview: raw.slice(0, 200) },
      { status: 502 }
    );
  }

  const rows = (parsed.suggestions ?? [])
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

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("pattern_suggestions").insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await supabase
    .from("imports")
    .update({
      status: "pronto",
      finished_at: new Date().toISOString(),
      provider_used: managed ? `brainfrost:${managed.provider}` : provider,
    })
    .eq("id", importId);

  return NextResponse.json({
    ok: true,
    provider: managed ? `brainfrost:${managed.provider}` : provider,
    suggestionsCreated: rows.length,
    redactions: sanitized.redactions,
  });
}
