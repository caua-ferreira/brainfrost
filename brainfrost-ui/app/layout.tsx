import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import { BottomNav } from "@/components/shell/BottomNav";
import type { PaletteNote } from "@/components/shell/CommandPalette";
import { readVault } from "@/lib/vault";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BrainFrost",
  description: "O cofre de contexto do Cauã: camadas de conhecimento e as conexões entre elas.",
};

export const viewport: Viewport = {
  themeColor: "#050E1A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const notes = paletteNotes();
  return (
    <html lang="pt-BR" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="font-sans antialiased">
        <div className="flex h-[100dvh] overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header commit={commit} notes={notes} />
            {/*
              Padding-bottom no mobile reserva o espaço do BottomNav fixo.
              A altura (~56px) + safe-area do iOS soma via env().
            */}
            <main className="min-h-0 flex-1 overflow-hidden pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
              {children}
            </main>
          </div>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
