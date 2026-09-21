"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, Settings, Snowflake, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Grafo", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/camadas", label: "Camadas", icon: Layers, match: (p: string) => p.startsWith("/camadas") },
  { href: "/cofre", label: "Cofre", icon: Sparkles, match: (p: string) => p.startsWith("/cofre") },
  { href: "/config", label: "Config", icon: Settings, match: (p: string) => p.startsWith("/config") },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-card/60 py-4 backdrop-blur hairline md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-4">
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
    </aside>
  );
}
