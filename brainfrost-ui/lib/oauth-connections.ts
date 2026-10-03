import { decrypt, encrypt } from "@/lib/crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const REPOSITORY_PROVIDERS = ["github", "gitlab"] as const;
export type RepositoryProvider = (typeof REPOSITORY_PROVIDERS)[number];

export function isRepositoryProvider(value: unknown): value is RepositoryProvider {
  return typeof value === "string" && (REPOSITORY_PROVIDERS as readonly string[]).includes(value);
}

export async function saveOAuthConnection(input: {
  userId: string;
  provider: RepositoryProvider;
  accessToken: string;
  refreshToken?: string | null;
  providerAccountId?: string | null;
  scopes?: string[];
}) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("oauth_connections").upsert({
    user_id: input.userId,
    provider: input.provider,
    access_token_cipher: encrypt(input.accessToken).toString("base64"),
    refresh_token_cipher: input.refreshToken
      ? encrypt(input.refreshToken).toString("base64")
      : null,
    provider_account_id: input.providerAccountId ?? null,
    scopes: input.scopes ?? [],
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider" });
  if (error) throw new Error(error.message);
}

export async function getOAuthConnection(userId: string, provider: RepositoryProvider) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("oauth_connections")
    .select("access_token_cipher,refresh_token_cipher,provider_account_id,scopes,updated_at")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    accessToken: decrypt(Buffer.from(data.access_token_cipher, "base64")),
    refreshToken: data.refresh_token_cipher
      ? decrypt(Buffer.from(data.refresh_token_cipher, "base64"))
      : null,
    providerAccountId: data.provider_account_id,
    scopes: data.scopes,
    updatedAt: data.updated_at,
  };
}
