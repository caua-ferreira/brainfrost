"use client";

import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useSession } from "./SessionProvider";
import { getSupabase } from "@/lib/supabase/client";

export function AccountMenu() {
  const { session } = useSession();
  const router = useRouter();

  if (!session) return null;

  const meta = session.user.user_metadata as {
    display_name?: string;
    avatar_initials?: string;
    mock_provider?: string;
  };
  const name = meta.display_name ?? "Você";
  const initials = meta.avatar_initials ?? name.slice(0, 2).toUpperCase();
  const provider = meta.mock_provider ?? "anônimo";

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
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-glow/20 font-mono text-[10px] font-semibold text-glow">
          {initials}
        </span>
        <span className="hidden text-[12px] md:inline">{name.split(" ")[0]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-foreground">{name}</span>
          <span className="font-mono text-[11px] text-muted-foreground">via {provider}</span>
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
