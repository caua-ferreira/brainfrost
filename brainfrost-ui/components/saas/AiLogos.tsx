/**
 * Logos dos LLMs e IAs de destino. As marcas que possuem assets aprovados
 * usam os arquivos locais da pasta mascot; as demais continuam em SVG.
 */

import Image from "next/image";
import { siSnowflake } from "simple-icons";
import type { SimpleIcon } from "simple-icons";

interface LogoProps {
  size?: number;
  className?: string;
  color?: string;
}

export function ClaudeLogo({ size = 20, className, color }: LogoProps) {
  return <AssetLogo src="/mascot/claude-code-icon.webp" size={size} className={className} label="Claude Code" />;
}

export function CursorLogo({ size = 20, className, color }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color ?? "currentColor"} className={className} aria-label="Cursor">
      <path d="M4 2l16 8-6.5 2.4L11 22 4 2z" />
    </svg>
  );
}

export function CopilotLogo({ size = 20, className }: LogoProps) {
  return <AssetLogo src="/mascot/github-copilot-icon.webp" size={size} className={className} label="GitHub Copilot" />;
}

export function CortexLogo({ size = 20, className, color }: LogoProps) {
  return <BrandLogo icon={siSnowflake} size={size} className={className} color={color} label="Snowflake Cortex" />;
}

export function GeminiLogo({ size = 20, className, color }: LogoProps) {
  return <AssetLogo src="/mascot/gemini-icon.webp" size={size} className={className} label="Google Gemini" />;
}

function AssetLogo({ src, size, className, label }: { src: string; size: number; className?: string; label: string }) {
  return <Image src={src} alt={label} width={size} height={size} unoptimized className={className} style={{ objectFit: "contain" }} />;
}

function BrandLogo({
  icon,
  size,
  className,
  color,
  label,
}: {
  icon: SimpleIcon;
  size: number;
  className?: string;
  color?: string;
  label: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ color: color ?? `#${icon.hex}` }}
      role="img"
      aria-label={label}
    >
      <path d={icon.path} />
    </svg>
  );
}

export function ChatGPTLogo({ size = 20, className, color }: LogoProps) {
  return <AssetLogo src="/mascot/chatgpt-icon.png" size={size} className={className} label="ChatGPT" />;
}

export const AI_TARGETS = [
  { id: "claude",   label: "Claude Code",      Icon: ClaudeLogo,   color: "#D97757" },
  { id: "cursor",   label: "Cursor",           Icon: CursorLogo,   color: "#000000" },
  { id: "copilot",  label: "GitHub Copilot",   Icon: CopilotLogo,  color: "#7B7B7B" },
  { id: "cortex",   label: "Snowflake Cortex", Icon: CortexLogo,   color: "#29B5E8" },
  { id: "gemini",   label: "Gemini",           Icon: GeminiLogo,   color: "#4285F4" },
  { id: "chatgpt",  label: "ChatGPT",          Icon: ChatGPTLogo,  color: "#10A37F" },
] as const;
