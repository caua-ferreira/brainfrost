import { Cpu, Settings2 } from "lucide-react";
import { siLmstudio, siOllama } from "simple-icons";
import {
  ChatGPTLogo,
  ClaudeLogo,
  CortexLogo,
  GeminiLogo,
} from "@/components/saas/AiLogos";
import type { ProviderPreset } from "@/lib/chat-client";

export function ProviderLogo({ preset, size = 24 }: { preset: ProviderPreset; size?: number }) {
  const color = preset.color;
  const shared = { size, color };

  if (preset.key === "claude" || preset.key === "claude-direct") {
    return <ClaudeLogo {...shared} />;
  }
  if (preset.key === "gpt") return <ChatGPTLogo {...shared} />;
  if (preset.key === "gemini") return <GeminiLogo {...shared} />;
  if (preset.key === "cortex") return <CortexLogo {...shared} />;
  if (preset.key === "webllm") return <Cpu size={size} strokeWidth={1.8} color={color} aria-label="WebLLM local" />;
  if (preset.key === "ollama") return <BrandLogo icon={siOllama} size={size} color={color} label="Ollama" />;
  if (preset.key === "lmstudio") return <BrandLogo icon={siLmstudio} size={size} color={color} label="LM Studio" />;
  return <Settings2 size={size} strokeWidth={1.8} color={color} aria-label="Endpoint personalizado" />;
}

function BrandLogo({ icon, size, color, label }: { icon: { path: string; hex: string }; size: number; color: string; label: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color }} role="img" aria-label={label}>
      <path d={icon.path} />
    </svg>
  );
}
