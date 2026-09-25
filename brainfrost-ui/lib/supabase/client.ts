import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabase() {
  if (!client) client = createBrowserClient<Database>(url, anonKey);
  return client;
}

export type SupabaseClient = ReturnType<typeof getSupabase>;
