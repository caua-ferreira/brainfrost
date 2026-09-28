import { Cpu, Settings2 } from "lucide-react";
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
  if (preset.key === "ollama") return <OllamaLogo size={size} color={color} />;
  if (preset.key === "lmstudio") return <LmStudioLogo size={size} color={color} />;
  return <Settings2 size={size} strokeWidth={1.8} color={color} aria-label="Endpoint personalizado" />;
}

function OllamaLogo({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-label="Ollama">
      <path d="M7.5 10.5V8.8a4.5 4.5 0 0 1 9 0v1.7" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8" />
      <circle cx="9" cy="11.5" r=".7" fill={color} stroke="none" />
      <circle cx="15" cy="11.5" r=".7" fill={color} stroke="none" />
    </svg>
  );
}

function LmStudioLogo({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-label="LM Studio">
      <rect x="3.5" y="4" width="17" height="13" rx="2.5" />
      <path d="M7.5 20h9M9 17v3M15 17v3M7.5 8.5v4h3M13 12.5h3.5M13 8.5v4" />
    </svg>
  );
}
