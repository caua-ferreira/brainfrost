import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSupabaseServer } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { sanitize } from "@/lib/sanitize";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionInput,
  isCategory,
  type LlmSuggestion,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

type Provider = "claude" | "gemini";

async function callClaude(apiKey: string, userText: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 2000,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userText }],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

async function callGemini(apiKey: string, userText: string): Promise<string> {
  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
    systemInstruction: EXTRACTION_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(userText);
  return result.response.text();
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: importId } = await ctx.params;

  const body = await request.json().catch(() => ({}));
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

  if (!creds || creds.length === 0) {
    return NextResponse.json(
      { error: "nenhuma chave de LLM configurada — vá em /config" },
      { status: 400 }
    );
  }

  const chosen =
    (providerPref && creds.find((c) => c.provider === providerPref)) ??
    creds.find((c) => c.provider === "claude") ??
    creds[0];

  let apiKey: string;
  try {
    apiKey = decrypt(Buffer.from(chosen.api_key_cipher, "base64"));
  } catch {
    return NextResponse.json({ error: "falha ao decifrar chave — reconfigure em /config" }, { status: 500 });
  }

  const sanitized = sanitize(imp.raw_text);
  const provider = chosen.provider as Provider;
  if (!isPro) {
    return NextResponse.json({ error: "Claude e Gemini são recursos do plano Pro." }, { status: 402 });
  }

  const { data: existingNotes } = await supabase
    .from("vault_notes")
    .select("slug, title, category")
    .order("updated_at", { ascending: false })
    .limit(200);
  const analysisInput = buildExtractionInput(sanitized.cleanText, existingNotes ?? []);

  let raw: string;
  try {
    raw =
      provider === "claude"
        ? await callClaude(apiKey, analysisInput)
        : await callGemini(apiKey, analysisInput);
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
      provider_used: provider,
    })
    .eq("id", importId);

  return NextResponse.json({
    ok: true,
    provider,
    suggestionsCreated: rows.length,
    redactions: sanitized.redactions,
  });
}
