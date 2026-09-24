import type { MetadataRoute } from "next";

// PWA nativo do Next — servido em /manifest.webmanifest. Sem service worker
// por enquanto: Safari/Chrome aceitam "Add to Home Screen" só com manifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BrainFrost",
    short_name: "BrainFrost",
    description: "Cofre de contexto para IA — grafo, chat e camadas de conhecimento.",
    start_url: "/",
    display: "standalone",
    background_color: "#050E1A",
    theme_color: "#050E1A",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
