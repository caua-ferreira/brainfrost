"use client";

import { SidebarNav } from "./SidebarNav";
import { useSaas } from "@/lib/saas-mock";

export function Sidebar() {
  const collapsed = useSaas((s) => s.sidebarCollapsed);
  return (
    <aside
      className={`hidden shrink-0 border-r border-border bg-card/60 backdrop-blur transition-[width] duration-200 md:block ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      <SidebarNav />
    </aside>
  );
}
