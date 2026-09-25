/**
 * Logos SVG dos LLMs e IAs de destino. Monocromáticos por padrão para
 * respeitar o tema — passar `color` fixa a cor original da marca.
 */

interface LogoProps {
  size?: number;
  className?: string;
  color?: string;
}

export function ClaudeLogo({ size = 20, className, color }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color ?? "currentColor"} className={className} aria-label="Claude">
      <path d="M4.7 15.6l4.4-11.4h2.8L7.5 15.6H4.7zm7.5 0l4.4-11.4h2.8L15 15.6h-2.8zM3.3 19.8h17.4v1.4H3.3v-1.4z" />
    </svg>
  );
}

export function CursorLogo({ size = 20, className, color }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color ?? "currentColor"} className={className} aria-label="Cursor">
      <path d="M4 2l16 8-6.5 2.4L11 22 4 2z" />
    </svg>
  );
}

export function CopilotLogo({ size = 20, className, color }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-label="GitHub Copilot">
      <path d="M4 14a8 8 0 0 1 16 0v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3z" />
      <path d="M8 13v3M16 13v3" />
      <path d="M9 8l3-3 3 3" />
    </svg>
  );
}

export function CortexLogo({ size = 20, className, color }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color ?? "currentColor"} className={className} aria-label="Snowflake Cortex">
      <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" stroke={color ?? "currentColor"} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function GeminiLogo({ size = 20, className, color }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color ?? "currentColor"} className={className} aria-label="Google Gemini">
      <path d="M12 2c.7 4.7 3.3 7.3 8 8-4.7.7-7.3 3.3-8 8-.7-4.7-3.3-7.3-8-8 4.7-.7 7.3-3.3 8-8z" />
    </svg>
  );
}

export function ChatGPTLogo({ size = 20, className, color }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? "currentColor"} strokeWidth="1.6" strokeLinejoin="round" className={className} aria-label="ChatGPT">
      <path d="M12 3.6c1.5-1.1 3.6-1.1 5.1 0 1.5 1.1 2.1 3.1 1.5 4.9 1.8.6 3 2.4 3 4.3 0 1.9-1.2 3.6-3 4.3.6 1.8 0 3.7-1.5 4.9-1.5 1.1-3.6 1.1-5.1 0-1.5 1.1-3.6 1.1-5.1 0-1.5-1.1-2.1-3.1-1.5-4.9-1.8-.6-3-2.4-3-4.3 0-1.9 1.2-3.6 3-4.3-.6-1.8 0-3.7 1.5-4.9 1.5-1.1 3.6-1.1 5.1 0z" />
    </svg>
  );
}

export const AI_TARGETS = [
  { id: "claude",   label: "Claude Code",      Icon: ClaudeLogo,   color: "#D97757" },
  { id: "cursor",   label: "Cursor",           Icon: CursorLogo,   color: "#000000" },
  { id: "copilot",  label: "GitHub Copilot",   Icon: CopilotLogo,  color: "#7B7B7B" },
  { id: "cortex",   label: "Snowflake Cortex", Icon: CortexLogo,   color: "#29B5E8" },
  { id: "gemini",   label: "Gemini",           Icon: GeminiLogo,   color: "#4285F4" },
  { id: "chatgpt",  label: "ChatGPT",          Icon: ChatGPTLogo,  color: "#10A37F" },
] as const;
