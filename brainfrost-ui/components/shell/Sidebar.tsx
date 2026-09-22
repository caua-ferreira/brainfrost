import { SidebarNav } from "./SidebarNav";

export function Sidebar() {
  // O desktop mantém o Sidebar fixo. O mobile usa MobileNav (Sheet).
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-card/60 backdrop-blur hairline md:block">
      <SidebarNav />
    </aside>
  );
}
