"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, MessagesSquare, Settings, Snowflake, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Grafo", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/chat", label: "Chat", icon: MessagesSquare, match: (p: string) => p.startsWith("/chat") },
  { href: "/camadas", label: "Camadas", icon: Layers, match: (p: string) => p.startsWith("/camadas") },
  { href: "/cofre", label: "Cofre", icon: Sparkles, match: (p: string) => p.startsWith("/cofre") },
  { href: "/config", label: "Config", icon: Settings, match: (p: string) => p.startsWith("/config") },
];

interface Props {
  /** Chamado quando um item é acionado — o MobileNav usa pra fechar o Sheet. */
  onNavigate?: () => void;
}

/**
 * Conteúdo compartilhado entre o Sidebar fixo do desktop e o Sheet do mobile.
 * O layout externo (largura, posição, borda) fica com quem monta o container;
 * aqui só definimos o miolo: logo, nav, rodapé informativo.
 */
export function SidebarNav({ onNavigate }: Props) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col py-4">
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-6 flex items-center gap-2 px-4"
      >
        <Snowflake className="h-5 w-5 text-glow" strokeWidth={1.8} />
        <span className="text-sm font-semibold tracking-tight text-arctic">BrainFrost</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
                active
                  ? "bg-rift/70 text-arctic"
                  : "text-arctic/65 hover:bg-rift/30 hover:text-arctic"
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-4 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-mute/70">
          cofre local
        </p>
        <p className="mt-1 font-mono text-[11px] text-arctic/80">
          .brainfrost/ · versionado no git
        </p>
      </div>
    </div>
  );
}
