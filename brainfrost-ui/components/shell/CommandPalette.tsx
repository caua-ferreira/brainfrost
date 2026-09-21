"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layers, Sparkles } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface PaletteNote {
  slug: string;
  title: string;
  layer: "core" | "growth";
  tags: string[];
}

interface Props {
  notes: PaletteNote[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Command palette global — Ctrl/Cmd+K abre. Filtragem, navegação por seta e
 * Escape vêm de graça do cmdk. Selecionar uma camada empurra pra
 * `/?camada=<slug>`; o BrainFrostShell sincroniza a URL com o reader.
 */
export function CommandPalette({ notes, open, onOpenChange }: Props) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function go(slug: string) {
    onOpenChange(false);
    router.push(`/?camada=${slug}`);
  }

  const core = notes.filter((n) => n.layer === "core");
  const growth = notes.filter((n) => n.layer === "growth");

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="buscar camada por título, tag ou slug…" />
      <CommandList>
        <CommandEmpty>Nada com esse termo.</CommandEmpty>
        {core.length > 0 && (
          <CommandGroup heading="core">
            {core.map((note) => (
              <PaletteItem key={note.slug} note={note} onSelect={() => go(note.slug)} />
            ))}
          </CommandGroup>
        )}
        {growth.length > 0 && (
          <CommandGroup heading="growth">
            {growth.map((note) => (
              <PaletteItem key={note.slug} note={note} onSelect={() => go(note.slug)} />
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function PaletteItem({ note, onSelect }: { note: PaletteNote; onSelect: () => void }) {
  // cmdk filtra pelo `value`; passar título+tags+slug amplia o casamento.
  const value = [note.title, note.slug, ...note.tags].join(" ");
  const Icon = note.layer === "core" ? Sparkles : Layers;
  return (
    <CommandItem value={value} onSelect={onSelect}>
      <Icon className={note.layer === "core" ? "text-glow" : "text-aurora"} />
      <span className="flex-1">{note.title}</span>
      <span className="font-mono text-[10px] text-mute">{note.slug}</span>
    </CommandItem>
  );
}
