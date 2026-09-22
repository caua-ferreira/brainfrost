"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Snowflake } from "lucide-react";
import { CommandPalette, type PaletteNote } from "./CommandPalette";

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
  commit: string;
  notes: PaletteNote[];
}

export function Header({ commit, notes }: Props) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card/40 px-4 backdrop-blur hairline md:h-14 md:px-6">
        {/* Mobile: marca + título grande. Desktop: só título (a marca está no Sidebar). */}
        <div className="flex min-w-0 items-center gap-2 md:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 md:hidden">
            <Snowflake className="h-5 w-5 text-glow" strokeWidth={1.8} />
          </Link>
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-arctic md:text-[15px]">
            {titleFor(pathname)}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-mute md:gap-3">
          {notes.length > 0 && (
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-glow/15 bg-rift/30 px-3 text-mute transition-colors active:bg-rift/60 active:text-arctic md:h-8 md:min-w-0 md:rounded-md md:px-2 md:hover:border-glow/50 md:hover:text-arctic"
              title="Buscar camada (Ctrl/Cmd+K)"
              aria-label="Buscar camada"
            >
              <Search className="h-4 w-4 md:h-3 md:w-3" />
              <span className="hidden tracking-widest md:inline">⌘K</span>
            </button>
          )}
          <Link
            href={`https://github.com/caua-ferreira/brainfrost/commit/${commit}`}
            target="_blank"
            rel="noreferrer"
            className="hidden text-mute transition-colors hover:text-arctic md:inline"
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
