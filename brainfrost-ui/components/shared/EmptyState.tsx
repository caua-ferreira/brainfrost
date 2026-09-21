import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-20 text-center",
        className
      )}
    >
      <div aria-hidden className="text-4xl text-glow">
        ❄
      </div>
      <h3 className="text-lg font-semibold text-arctic">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm leading-relaxed text-mute">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
