"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSaas } from "@/lib/saas-mock";

export const DEFAULT_YETI_MASCOT = "/mascot/yeti-video-ezgif.com-crop.gif";

interface Props {
  message?: string;
  mascot?: string;
  fullScreen?: boolean;
  popup?: boolean;
  className?: string;
}

export function LoadingScreen({
  message = "carregando…",
  mascot = DEFAULT_YETI_MASCOT,
  fullScreen = false,
  popup = false,
  className,
}: Props) {
  const theme = useSaas((state) => state.theme);
  const isLight = theme === "light";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center bg-background px-6 text-foreground",
        popup
          ? "min-h-0 w-full max-w-xs rounded-2xl border p-4 shadow-2xl"
          : fullScreen
            ? "h-[100dvh]"
            : "h-full",
        className
      )}
      style={{
        backgroundColor: popup
          ? isLight
            ? "rgba(255, 255, 255, 0.96)"
            : "rgba(10, 26, 47, 0.96)"
          : isLight
            ? "#F0F5FA"
            : "#050E1A",
        borderColor: popup ? (isLight ? "rgba(8, 36, 58, 0.12)" : "rgba(90, 216, 255, 0.18)") : undefined,
        color: isLight ? "#08243A" : "#E9F6FF",
      }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-3xl bg-white/90 p-3 shadow-sm ring-1 ring-black/5">
          <Image
            src={mascot}
            alt="Yeti do BrainFrost carregando"
            width={180}
            height={180}
            unoptimized
            priority={fullScreen}
            className={cn(
              popup ? "h-28 w-28 sm:h-32 sm:w-32" : "h-40 w-40 sm:h-44 sm:w-44",
              "object-contain"
            )}
          />
        </div>
        <p
          className="font-mono text-[11px] uppercase tracking-[0.28em]"
          style={{ color: isLight ? "#6480A0" : "#7E9BB8" }}
        >
          {message}
          <span className="inline-block w-8 text-left">...</span>
        </p>
      </div>
    </div>
  );
}
