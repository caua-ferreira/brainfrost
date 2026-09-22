"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Snowflake } from "lucide-react";
import { CommandPalette, type PaletteNote } from "./CommandPalette";
import { MobileNav } from "./MobileNav";

const TITLE: Record<string, string> = {
  "/": "Grafo",
  "/chat": "Chat",
  "/camadas": "Camadas",
  "/cofre": "Cofre",
  "/config": "Config",
};

function titleFor(pathname: string) {
  return TITLE[pathname] ?? "BrainFrost";
}

interface Props {
  /**
   * Sha do commit atual, injetado no build. A Vercel expõe automaticamente
   * `VERCEL_GIT_COMMIT_SHA`; localmente aparece como "local".
   */
  commit: string;
  /**
   * Camadas leves (slug/título/layer/tags) para alimentar o ⌘K. Se o cofre
   * não pôde ser lido no build, vem vazio — o hint some.
   */
  notes: PaletteNote[];
}

export function Header({ commit, notes }: Props) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card/40 px-3 backdrop-blur hairline md:gap-4 md:px-6">
        <MobileNav />

        <div className="flex flex-1 items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:hidden">
            <Snowflake className="h-4 w-4 text-glow" strokeWidth={1.8} />
            <span className="text-sm font-semibold text-arctic">BrainFrost</span>
          </div>

          <h1 className="hidden text-[15px] font-semibold tracking-tight text-arctic md:block">
            {titleFor(pathname)}
          </h1>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-mute md:gap-3">
          {notes.length > 0 && (
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-glow/15 bg-rift/30 p-1.5 text-mute transition-colors hover:border-glow/50 hover:text-arctic sm:px-2 sm:py-1"
              title="Buscar camada (Ctrl/Cmd+K)"
              aria-label="Buscar camada"
            >
              <Search className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              <span className="hidden tracking-widest sm:inline">⌘K</span>
            </button>
          )}
          <Link
            href={`https://github.com/caua-ferreira/brainfrost/commit/${commit}`}
            target="_blank"
            rel="noreferrer"
            className="hidden text-mute transition-colors hover:text-arctic sm:inline"
          >
            {commit === "local" ? "local" : commit.slice(0, 7)}
          </Link>
        </div>
      </header>

      {notes.length > 0 && (
        <CommandPalette notes={notes} open={paletteOpen} onOpenChange={setPaletteOpen} />
      )}
    </>
  );
}
