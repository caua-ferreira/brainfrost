"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Snowflake } from "lucide-react";

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
}

export function Header({ commit }: Props) {
  const pathname = usePathname();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card/40 px-4 backdrop-blur hairline md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Snowflake className="h-4 w-4 text-glow" strokeWidth={1.8} />
        <span className="text-sm font-semibold text-arctic">BrainFrost</span>
      </div>

      <h1 className="hidden text-[15px] font-semibold tracking-tight text-arctic md:block">
        {titleFor(pathname)}
      </h1>

      <div className="flex items-center gap-3 font-mono text-[11px] text-mute">
        <span className="hidden rounded-md border border-glow/15 bg-rift/30 px-2 py-1 tracking-widest sm:inline">
          ⌘K em breve
        </span>
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
  );
}
