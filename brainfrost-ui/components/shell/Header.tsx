"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { CommandPalette, type PaletteNote } from "./CommandPalette";
import { AccountMenu } from "@/components/saas/AccountMenu";
import { NotificationBell } from "@/components/saas/NotificationBell";

const TITLE: Record<string, string> = {
  "/grafo": "Cérebro",
  "/painel": "Painel",
  "/importar": "Importar",
  "/curadoria": "Curadoria",
  "/exportar": "Exportar",
  "/chat": "Chat",
  "/camadas": "Camadas",
  "/cofre": "Cérebro",
  "/assinatura": "Assinatura",
  "/observabilidade": "Observabilidade",
  "/gestao-assinaturas": "Gestão",
  "/perfil": "Perfil",
  "/config": "Config",
};

function titleFor(pathname: string) {
  return TITLE[pathname] ?? "BrainFrost";
}

interface Props {
  commit: string;
  notes: PaletteNote[];
}

export function Header({ commit, notes }: Props) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/40 px-4 backdrop-blur md:h-14 md:px-6">
        <div className="flex min-w-0 items-center gap-2 md:gap-4">
          <Link href="/painel" className="flex shrink-0 items-center gap-2 md:hidden">
            <Image
              src="/mascot/yeti-icon.png"
              alt="BrainFrost"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
          </Link>
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-foreground md:text-[15px]">
            {titleFor(pathname)}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-muted-foreground md:gap-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 text-muted-foreground transition-colors hover:text-foreground md:h-8 md:min-w-0 md:rounded-md md:px-2"
            title="Buscar camada (Ctrl/Cmd+K)"
            aria-label="Buscar camada"
          >
            <Search className="h-4 w-4 md:h-3 md:w-3" />
            <span className="hidden tracking-widest md:inline">⌘K / Ctrl+K</span>
          </button>
          <NotificationBell />
          <AccountMenu />
        </div>
      </header>

      <CommandPalette notes={notes} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
