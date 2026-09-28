"use client";

import { ArrowUpRight, Layers3 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Note } from "@/lib/types";
import type { NoteGroup } from "@/lib/graph-groups";

interface Props {
  group: NoteGroup | null;
  onSelectNote: (slug: string) => void;
  onClose: () => void;
}

export default function GroupPanel({ group, onSelectNote, onClose }: Props) {
  if (!group) return null;

  return (
    <Sheet open={!!group} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l bg-card p-0 text-arctic hairline sm:max-w-[560px]"
      >
        <SheetHeader className="space-y-3 border-b p-5 text-left hairline">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers3 className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                gaveta · {group.notes.length} {group.notes.length === 1 ? "camada" : "camadas"}
              </p>
              <SheetTitle className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground">
                {group.title}
              </SheetTitle>
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {group.description} Clique numa camada para abrir o conteúdo completo e suas ligações.
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>conteúdo da gaveta</span>
            <span>{group.connections} relações externas</span>
          </div>
          <div className="space-y-2">
            {group.notes.map((note) => (
              <GroupNote key={note.slug} note={note} onSelect={() => onSelectNote(note.slug)} />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function GroupNote({ note, onSelect }: { note: Note; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/70" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-foreground">{note.title}</span>
        <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-muted-foreground">
          {note.excerpt || "Sem resumo disponível."}
        </span>
        <span className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
          <span>{note.links.length + note.backlinks.length} conexões</span>
          <span>{note.words} palavras</span>
        </span>
      </span>
      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" strokeWidth={1.8} />
    </button>
  );
}
