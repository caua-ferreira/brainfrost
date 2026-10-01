"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Download,
  BadgeDollarSign,
  CreditCard,
  ChartNoAxesCombined,
  Home,
  LayoutDashboard,
  Layers,
  ListChecks,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSaas } from "@/lib/saas-mock";
import { useSession } from "@/components/saas/SessionProvider";

const NAV = [
  { href: "/painel", label: "Painel", icon: Home, match: (p: string) => p.startsWith("/painel") },
  { href: "/importar", label: "Importar", icon: Upload, match: (p: string) => p.startsWith("/importar") || p.startsWith("/analisando") },
  { href: "/curadoria", label: "Curadoria", icon: ListChecks, match: (p: string) => p.startsWith("/curadoria") },
  { href: "/exportar", label: "Exportar", icon: Download, match: (p: string) => p.startsWith("/exportar") },
  { href: "/grafo", label: "Cérebro", icon: LayoutDashboard, match: (p: string) => p === "/grafo" || p === "/cofre" },
  { href: "/chat", label: "Chat", icon: MessagesSquare, match: (p: string) => p.startsWith("/chat") },
  { href: "/camadas", label: "Camadas", icon: Layers, match: (p: string) => p.startsWith("/camadas") },
  { href: "/assinatura", label: "Assinatura", icon: CreditCard, match: (p: string) => p.startsWith("/assinatura") },
  { href: "/config", label: "Config", icon: Settings, match: (p: string) => p.startsWith("/config") },
];

const OBSERVABILITY_NAV = {
  href: "/observabilidade",
  label: "Observabilidade",
  icon: ChartNoAxesCombined,
  match: (p: string) => p.startsWith("/observabilidade"),
};

const SUBSCRIPTIONS_ADMIN_NAV = {
  href: "/gestao-assinaturas",
  label: "Gestão Pro",
  icon: BadgeDollarSign,
  match: (p: string) => p.startsWith("/gestao-assinaturas"),
};

interface Props {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: Props) {
  const pathname = usePathname();
  const { session } = useSession();
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const collapsed = useSaas((s) => s.sidebarCollapsed);
  const toggle = useSaas((s) => s.toggleSidebar);

  useEffect(() => {
    if (!session) {
      setCanViewAdmin(false);
      return;
    }

    const controller = new AbortController();
    fetch("/api/observability/access", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ allowed: boolean }> : { allowed: false })
      .then(({ allowed }) => setCanViewAdmin(allowed))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCanViewAdmin(false);
      });

    return () => controller.abort();
  }, [session]);

  const navItems = canViewAdmin
    ? [...NAV.slice(0, -1), OBSERVABILITY_NAV, SUBSCRIPTIONS_ADMIN_NAV, NAV[NAV.length - 1]]
    : NAV;

  return (
    <div className="flex h-full flex-col py-4">
      <Link
        href="/painel"
        onClick={onNavigate}
        className={cn("mb-6 flex items-center gap-2", collapsed ? "justify-center px-2" : "px-4")}
      >
        <Image
          src="/mascot/yeti-icon.png"
          alt="BrainFrost"
          width={24}
          height={24}
          className="h-6 w-6 shrink-0 object-contain"
        />
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-foreground">BrainFrost</span>
        )}
      </Link>

      <nav className={cn("flex flex-1 flex-col gap-0.5", collapsed ? "px-1.5" : "px-2")}>
        {navItems.map(({ href, label, icon: Icon, match }) => {
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
      </div>
    </div>
  );
}
