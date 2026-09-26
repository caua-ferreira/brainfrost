import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente com service_role — bypassa RLS. USE APENAS no webhook do Stripe
 * (que valida signature). Qualquer outro uso vira brecha de segurança.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin() {
  if (!serviceRole) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente — webhook não pode gravar.");
  }
  if (!cached) {
    cached = createClient<Database>(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
