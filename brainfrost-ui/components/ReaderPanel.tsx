"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Note } from "@/lib/types";

interface Props {
  note: Note;
  notes: Note[];
  onNavigate: (slug: string) => void;
  onClose: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReaderPanel({ note, notes, onNavigate, onClose }: Props) {
  const titleOf = (slug: string) => notes.find((n) => n.slug === slug)?.title ?? slug;

  return (
    <aside
      className="pane flex h-full flex-col rounded-t-2xl shadow-pane animate-drift md:rounded-none md:rounded-l-2xl"
      aria-label={`Camada ${note.title}`}
    >
      <header className="flex items-start justify-between gap-4 border-b p-5 hairline">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-glow">
            {note.file} · {formatDate(note.updatedAt)}
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">{note.title}</h2>
          {note.tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-glow/20 bg-glow/5 px-2 py-0.5 font-mono text-[10px] text-mute"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-md border border-glow/20 px-2.5 py-1 font-mono text-xs text-mute transition-colors hover:border-glow/50 hover:text-arctic"
          aria-label="Fechar a camada"
        >
          fechar
        </button>
      </header>

      <div className="reader flex-1 overflow-y-auto p-5">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a({ href, children, ...rest }) {
              if (href?.startsWith("brainfrost:")) {
                const slug = href.replace("brainfrost:", "");
                const exists = notes.some((n) => n.slug === slug);
                if (!exists) {
                  return (
                    <span className="text-mute/70 underline decoration-dotted" title="Camada ainda não existe">
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

      {(note.links.length > 0 || note.backlinks.length > 0 || note.broken.length > 0) && (
        <footer className="space-y-3 border-t p-5 hairline">
          {note.links.length > 0 && (
            <ConnectionRow label="aponta para" slugs={note.links} onNavigate={onNavigate} titleOf={titleOf} />
          )}
          {note.backlinks.length > 0 && (
            <ConnectionRow label="citada por" slugs={note.backlinks} onNavigate={onNavigate} titleOf={titleOf} />
          )}
          {note.broken.length > 0 && (
            <p className="font-mono text-[11px] text-aurora/80">
              link sem destino: {note.broken.join(", ")}
            </p>
          )}
        </footer>
      )}
    </aside>
  );
}

function ConnectionRow({
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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[11px] text-mute">{label}</span>
      {slugs.map((slug) => (
        <button
          key={slug}
          onClick={() => onNavigate(slug)}
          className="rounded-md border border-glow/20 bg-glow/5 px-2 py-1 text-xs text-arctic/85 transition-colors hover:border-glow/60 hover:text-arctic"
        >
          {titleOf(slug)}
        </button>
      ))}
    </div>
  );
}
