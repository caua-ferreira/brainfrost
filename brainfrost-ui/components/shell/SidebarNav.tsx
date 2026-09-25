"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Download,
  Home,
  LayoutDashboard,
  Layers,
  ListChecks,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Snowflake,
  Sparkles,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSaas } from "@/lib/saas-mock";

const NAV = [
  { href: "/painel", label: "Painel", icon: Home, match: (p: string) => p.startsWith("/painel") },
  { href: "/importar", label: "Importar", icon: Upload, match: (p: string) => p.startsWith("/importar") || p.startsWith("/analisando") },
  { href: "/curadoria", label: "Curadoria", icon: ListChecks, match: (p: string) => p.startsWith("/curadoria") },
  { href: "/exportar", label: "Exportar", icon: Download, match: (p: string) => p.startsWith("/exportar") },
  { href: "/", label: "Grafo", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/chat", label: "Chat", icon: MessagesSquare, match: (p: string) => p.startsWith("/chat") },
  { href: "/camadas", label: "Camadas", icon: Layers, match: (p: string) => p.startsWith("/camadas") },
  { href: "/cofre", label: "Cofre", icon: Sparkles, match: (p: string) => p.startsWith("/cofre") },
  { href: "/config", label: "Config", icon: Settings, match: (p: string) => p.startsWith("/config") },
];

interface Props {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: Props) {
  const pathname = usePathname();
  const collapsed = useSaas((s) => s.sidebarCollapsed);
  const toggle = useSaas((s) => s.toggleSidebar);

  return (
    <div className="flex h-full flex-col py-4">
      <Link
        href="/painel"
        onClick={onNavigate}
        className={cn("mb-6 flex items-center gap-2", collapsed ? "justify-center px-2" : "px-4")}
      >
        <Snowflake className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-foreground">BrainFrost</span>
        )}
      </Link>

      <nav className={cn("flex flex-1 flex-col gap-0.5", collapsed ? "px-1.5" : "px-2")}>
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md text-[13px] transition-colors",
                collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                active
                  ? "bg-muted text-foreground"
                  : "text-foreground/65 hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className={cn("mt-auto pt-4", collapsed ? "px-1.5" : "px-4")}>
        <button
          onClick={toggle}
          title={collapsed ? "Expandir sidebar" : "Encolher sidebar"}
          className={cn(
            "flex w-full items-center gap-2 rounded-md text-[12px] text-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground",
            collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.8} />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.8} />
              <span>Encolher</span>
            </>
          )}
        </button>
        {!collapsed && (
          <>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              cofre online
            </p>
            <p className="mt-1 font-mono text-[11px] text-foreground/80">
              brainfrost · sincronizado
            </p>
          </>
        )}
      </div>
    </div>
  );
}
