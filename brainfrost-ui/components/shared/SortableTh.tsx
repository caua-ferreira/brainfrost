"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";
export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

/** Hook compartilhado — mesma UX de sort em /cofre e /camadas. */
export function useSort<K extends string>(
  initialKey: K,
  initialDir: SortDir = "desc"
): { sort: SortState<K>; toggleSort: (key: K) => void } {
  const [sort, setSort] = useState<SortState<K>>({ key: initialKey, dir: initialDir });
  function toggleSort(key: K) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "title" ? "asc" : "desc" }
    );
  }
  return { sort, toggleSort };
}

interface Props<K extends string> {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (k: K) => void;
  align?: "right";
}

export function SortableTh<K extends string>({ label, sortKey, sort, onSort, align }: Props<K>) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("px-4 py-3", align === "right" && "text-right")}>
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 uppercase tracking-widest transition-colors",
          active ? "text-arctic" : "hover:text-arctic"
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}
