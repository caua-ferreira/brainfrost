"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Snowflake } from "lucide-react";
import { CommandPalette, type PaletteNote } from "./CommandPalette";

const TITLE: Record<string, string> = {
  "/": "Grafo",
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
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card/40 px-4 backdrop-blur hairline md:px-6">
        <div className="flex items-center gap-2 md:hidden">
          <Snowflake className="h-4 w-4 text-glow" strokeWidth={1.8} />
          <span className="text-sm font-semibold text-arctic">BrainFrost</span>
        </div>

        <h1 className="hidden text-[15px] font-semibold tracking-tight text-arctic md:block">
          {titleFor(pathname)}
        </h1>

        <div className="flex items-center gap-3 font-mono text-[11px] text-mute">
          {notes.length > 0 && (
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-1.5 rounded-md border border-glow/15 bg-rift/30 px-2 py-1 tracking-widest text-mute transition-colors hover:border-glow/50 hover:text-arctic sm:inline-flex"
              title="Buscar camada (Ctrl/Cmd+K)"
            >
              <Search className="h-3 w-3" />
              ⌘K
            </button>
          )}
          <Link
            href={`https://github.com/caua-ferreira/brainfrost/commit/${commit}`}
            target="_blank"
            rel="noreferrer"
            className="text-mute transition-colors hover:text-arctic"
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
