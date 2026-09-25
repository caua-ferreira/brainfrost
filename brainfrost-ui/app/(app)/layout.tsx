import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import { BottomNav } from "@/components/shell/BottomNav";
import type { PaletteNote } from "@/components/shell/CommandPalette";
import { readVault } from "@/lib/vault";
import { AuthGuard } from "@/components/saas/AuthGuard";
import { ThemeApplicator } from "@/components/saas/ThemeApplicator";

const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

function paletteNotes(): PaletteNote[] {
  try {
    return readVault().notes.map((n) => ({
      slug: n.slug,
      title: n.title,
      layer: n.layer,
      tags: n.tags,
    }));
  } catch {
    return [];
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const notes = paletteNotes();
  return (
    <AuthGuard>
      <ThemeApplicator />
      <div className="flex h-[100dvh] overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header commit={commit} notes={notes} />
          <main className="min-h-0 flex-1 overflow-hidden pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
