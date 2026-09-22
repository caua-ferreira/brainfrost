"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./SidebarNav";

/**
 * Hamburger + Sheet lateral para navegação em telas pequenas. Só aparece
 * abaixo de md; no desktop o Sidebar fixo já resolve. O onNavigate do
 * SidebarNav fecha o sheet ao clicar num item — sem isso o painel fica
 * aberto depois da rota mudar.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Abrir menu"
          className="rounded-md p-1.5 text-arctic transition-colors hover:bg-rift/40 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 border-r bg-card p-0 text-arctic hairline"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navegação do BrainFrost</SheetTitle>
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
