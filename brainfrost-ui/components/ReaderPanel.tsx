"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/types";

interface Props {
  note: Note | null;
  notes: Note[];
  onNavigate: (slug: string) => void;
  onClose: () => void;
}

// timeZone fixo em UTC pelo mesmo motivo do BrainFrostShell: sem isso,
// server e cliente podem formatar dias distintos e a hidratação estoura.
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildPrompt(note: Note) {
  const tagLine = note.tags.length > 0 ? `tags: ${note.tags.join(", ")}\n` : "";
  return `# Contexto: ${note.title}\n${tagLine}\n${note.raw}\n`;
}

export default function ReaderPanel({ note, notes, onNavigate, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  // Volta o rótulo do botão pra "copiar" depois de 2s sem novos cliques.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!note) return null;

  const titleOf = (slug: string) => notes.find((n) => n.slug === slug)?.title ?? slug;

  async function copyPrompt() {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(buildPrompt(note));
      setCopied(true);
    } catch {
      // Clipboard bloqueado por permissão do browser — não travamos a UI.
    }
  }

  return (
    <Sheet open={!!note} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l bg-card p-0 text-arctic hairline sm:max-w-[640px] lg:max-w-[720px]"
      >
        <SheetHeader className="space-y-3 border-b p-5 text-left hairline">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[11px] text-glow">
              {note.file} · {formatDate(note.updatedAt)}
            </p>
            <button
              onClick={copyPrompt}
              className="flex items-center gap-1.5 rounded-md border border-glow/20 px-3 py-1.5 font-mono text-[11px] text-mute transition-colors hover:border-glow/60 hover:text-arctic"
              title="Copia título + tags + corpo pronto para colar num prompt"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> copiado
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> copiar prompt
                </>
              )}
            </button>
          </div>
          <SheetTitle className="truncate text-lg font-semibold tracking-tight text-arctic">
            {note.title}
          </SheetTitle>
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="border-glow/20 bg-glow/5 font-mono text-[10px] text-mute"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </SheetHeader>

        <Tabs defaultValue="text" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-5 mt-3 grid w-auto grid-cols-3 bg-abyss/60 p-1">
            <TabsTrigger value="text" className="text-xs">
              Texto
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs">
              Ligações
              <span className="ml-1.5 font-mono text-[10px] text-mute">
                {note.links.length + note.backlinks.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="source" className="text-xs">
              Fonte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-0 min-h-0 flex-1 overflow-y-auto p-5">
            <div className="reader">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a({ href, children, ...rest }) {
                    if (href?.startsWith("brainfrost:")) {
                      const slug = href.replace("brainfrost:", "");
                      const exists = notes.some((n) => n.slug === slug);
                      if (!exists) {
                        return (
                          <span
                            className="text-mute/70 underline decoration-dotted"
                            title="Camada ainda não existe"
                          >
                            {children}
                          </span>
                        );
                      }
                      return (
                        <button
                          onClick={() => onNavigate(slug)}
                          className="text-glow underline decoration-glow/40 underline-offset-2 transition-colors hover:decoration-glow"
                        >
                          {children}
                        </button>
                      );
                    }
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-glow underline decoration-glow/40 underline-offset-2"
                        {...rest}
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {note.content}
              </ReactMarkdown>
            </div>
          </TabsContent>

          <TabsContent value="links" className="mt-0 min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <ConnectionGroup
              label="aponta para"
              slugs={note.links}
              onNavigate={onNavigate}
              titleOf={titleOf}
            />
            <ConnectionGroup
              label="citada por"
              slugs={note.backlinks}
              onNavigate={onNavigate}
              titleOf={titleOf}
            />
            {note.broken.length > 0 && (
              <div className="rounded-md border border-aurora/40 bg-aurora/5 p-3">
                <p className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-aurora">
                  links sem destino
                </p>
                <p className="font-mono text-[12px] text-arctic/85">{note.broken.join(", ")}</p>
              </div>
            )}
            {note.links.length + note.backlinks.length + note.broken.length === 0 && (
              <p className="text-sm text-mute">Nenhuma ligação registrada nesta camada.</p>
            )}
          </TabsContent>

          <TabsContent value="source" className="mt-0 min-h-0 flex-1 overflow-y-auto p-5">
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-glow/15 bg-abyss/70 p-4 font-mono text-[12px] leading-relaxed text-arctic/90">
              {note.raw}
            </pre>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function ConnectionGroup({
  label,
  slugs,
  onNavigate,
  titleOf,
}: {
  label: string;
  slugs: string[];
  onNavigate: (slug: string) => void;
  titleOf: (slug: string) => string;
}) {
  if (slugs.length === 0) return null;
  return (
    <section>
      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-mute">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {slugs.map((slug) => (
          <button
            key={slug}
            onClick={() => onNavigate(slug)}
            className={cn(
              "rounded-md border border-glow/20 bg-glow/5 px-2 py-1 text-xs text-arctic/85 transition-colors",
              "hover:border-glow/60 hover:text-arctic"
            )}
          >
            {titleOf(slug)}
          </button>
        ))}
      </div>
    </section>
  );
}
