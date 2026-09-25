"use client";

import { LogOut, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "./SessionProvider";
import { getSupabase } from "@/lib/supabase/client";

interface Identity {
  provider?: string;
  identity_data?: {
    full_name?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
    picture?: string;
  };
}

function extractDisplay(user: { user_metadata?: Record<string, unknown>; identities?: Identity[]; email?: string | null }) {
  const meta = user.user_metadata ?? {};
  const identity = user.identities?.[0]?.identity_data ?? {};

  const name =
    (meta.display_name as string | undefined) ??
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    identity.full_name ??
    identity.name ??
    (user.email ?? undefined) ??
    "Você";

  const email =
    (meta.email as string | undefined) ??
    identity.email ??
    (user.email ?? undefined) ??
    "";

  const avatar =
    (meta.avatar_url as string | undefined) ??
    (meta.picture as string | undefined) ??
    identity.avatar_url ??
    identity.picture ??
    null;

  const initials =
    (meta.avatar_initials as string | undefined) ??
    name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "??";

  const provider =
    (meta.mock_provider as string | undefined) ??
    user.identities?.[0]?.provider ??
    "anônimo";

  return { name, email, avatar, initials, provider };
}

export function AccountMenu() {
  const { session } = useSession();
  const router = useRouter();

  if (!session) return null;

  const { name, email, avatar, initials, provider } = extractDisplay(session.user);
  const firstName = name.split(/\s+/)[0];

  const logout = async () => {
    await getSupabase().auth.signOut();
    router.replace("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 items-center gap-2 rounded-full border border-glow/15 bg-rift/30 pl-1 pr-3 text-arctic transition-colors hover:border-glow/50"
        aria-label="Menu da conta"
      >
        <span className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-glow/20 font-mono text-[10px] font-semibold text-glow">
          {avatar ? (
            <Image src={avatar} alt={name} fill sizes="24px" className="object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="hidden text-[12px] md:inline">{firstName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-foreground">{name}</span>
          {email && <span className="font-mono text-[11px] text-muted-foreground">{email}</span>}
          <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            via {provider}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/config")}>
          <User className="mr-2 h-3.5 w-3.5" strokeWidth={1.8} />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-3.5 w-3.5" strokeWidth={1.8} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
