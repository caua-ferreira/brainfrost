import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente Supabase para rotas API / Server Components. Lê o JWT dos cookies
 * — RLS ativa. Não bypassa nada.
 */
export async function getSupabaseServer() {
  const store = await cookies();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // set falha em Server Components; ok em Route Handlers/Server Actions.
        }
      },
    },
  });
}
