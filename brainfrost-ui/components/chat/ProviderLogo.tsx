import { Cpu, Settings2 } from "lucide-react";
import Image from "next/image";
import { siLmstudio, siOllama } from "simple-icons";
import {
  CortexLogo,
} from "@/components/saas/AiLogos";
import type { ProviderPreset } from "@/lib/chat-client";

export function ProviderLogo({ preset, size = 24 }: { preset: ProviderPreset; size?: number }) {
  const color = preset.color;
  const shared = { size, color };

  if (preset.key === "claude" || preset.key === "claude-direct") {
    return <AssetLogo src="/mascot/claude-code-icon.webp" size={size} label="Claude Code" />;
  }
  if (preset.key === "gpt") return <AssetLogo src="/mascot/chatgpt-icon.png" size={size} label="ChatGPT" framed />;
  if (preset.key === "gemini") return <AssetLogo src="/mascot/gemini-icon.webp" size={size} label="Google Gemini" />;
  if (preset.key === "cortex") return <CortexLogo {...shared} />;
  if (preset.key === "webllm") return <Cpu size={size} strokeWidth={1.8} color={color} aria-label="WebLLM local" />;
  if (preset.key === "ollama") return <BrandLogo icon={siOllama} size={size} color={color} label="Ollama" />;
  if (preset.key === "lmstudio") return <BrandLogo icon={siLmstudio} size={size} color={color} label="LM Studio" />;
  return <Settings2 size={size} strokeWidth={1.8} color={color} aria-label="Endpoint personalizado" />;
}

function AssetLogo({
  src,
  size,
  label,
  framed = false,
}: {
  src: string;
  size: number;
  label: string;
  framed?: boolean;
}) {
  return (
    <span
      className={framed ? "flex items-center justify-center rounded bg-white p-0.5" : "flex items-center justify-center"}
      style={{ width: size, height: size }}
    >
      <Image src={src} alt={label} width={size} height={size} unoptimized className="h-full w-full object-contain" />
    </span>
  );
}

function BrandLogo({ icon, size, color, label }: { icon: { path: string; hex: string }; size: number; color: string; label: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color }} role="img" aria-label={label}>
      <path d={icon.path} />
    </svg>
  );
}
