"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  MessagesSquare,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}

const NAV: Item[] = [
  { href: "/", label: "Grafo", icon: LayoutDashboard, match: (p) => p === "/" },
  { href: "/chat", label: "Chat", icon: MessagesSquare, match: (p) => p.startsWith("/chat") },
  { href: "/camadas", label: "Camadas", icon: Layers, match: (p) => p.startsWith("/camadas") },
  { href: "/cofre", label: "Cofre", icon: Sparkles, match: (p) => p.startsWith("/cofre") },
  { href: "/config", label: "Config", icon: Settings, match: (p) => p.startsWith("/config") },
];

/**
 * Bottom navigation — ícone + label sempre visível, item ativo destacado
 * em glow. É o padrão de app nativo mobile; substitui o hamburger que
 * dava sensação de "site encolhido". Fica fixado no rodapé com safe-area
 * pro iOS e some no desktop (aí o Sidebar fixo já resolve).
 */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-abyss/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] hairline md:hidden"
      aria-label="Navegação principal"
    >
      {NAV.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 transition-colors",
              active ? "text-glow" : "text-mute active:text-arctic"
            )}
          >
            <Icon
              className={cn("h-5 w-5 transition-transform", active && "scale-110")}
              strokeWidth={active ? 2.2 : 1.7}
            />
            <span
              className={cn(
                "text-[10.5px] font-medium tracking-wide",
                active && "text-arctic"
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
