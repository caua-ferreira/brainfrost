import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Estado vazio expressivo — no mobile o ícone é grande (60px) e o título
 * mais pesado. No desktop compacta. Reflete o padrão de app nativo, onde
 * o vazio é um momento explicativo, não um espaço morto.
 */
export function EmptyState({ title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center md:gap-3 md:py-20",
        className
      )}
    >
      <div aria-hidden className="text-6xl text-glow md:text-4xl">
        ❄
      </div>
      <h3 className="text-xl font-semibold text-arctic md:text-lg">{title}</h3>
      {description && (
        <p className="max-w-md text-[15px] leading-relaxed text-mute md:max-w-sm md:text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-3 md:mt-2">{action}</div>}
    </div>
  );
}
