"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { sendChat, type ChatConfig, type ProviderPreset } from "@/lib/chat-client";
import { useChatStore } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: ProviderPreset | null;
}

type Status =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

/**
 * Modal de conectar — versão simplificada. Só aparece depois que o usuário
 * escolheu um provedor no picker. Renderiza apenas os campos que o preset
 * declara em `needs`; todo o resto (api, url padrão, headers) já vem
 * preenchido do preset.
 */
export function ConfigDrawer({ open, onOpenChange, preset }: Props) {
  const saveConfig = useChatStore((s) => s.saveConfig);
  const setActive = useChatStore((s) => s.setActiveConfig);

  const [values, setValues] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (open && preset) {
      // Pré-preenche com os defaults do preset (útil pro campo model).
      setValues({
        url: preset.url,
        model: preset.model,
        apiKey: "",
        extraKey: "",
      });
      setStatus({ kind: "idle" });
      setShowKey(false);
    }
  }, [open, preset]);

  if (!preset) return null;

  async function testAndSave() {
    if (!preset) return;
    const cfg: ChatConfig = {
      label: preset.label,
      api: preset.api,
      url: values.url || preset.url,
      model: values.model || preset.model,
      apiKey: values.apiKey ?? "",
      extraKey: values.extraKey || undefined,
      headers: preset.headers,
      dangerouslyAllowBrowser: preset.dangerouslyAllowBrowser,
    };
    for (const field of preset.needs) {
      const v = (values[field.key] ?? "").trim();
      if (!v) {
        setStatus({ kind: "error", message: `Preencha "${field.label}".` });
        return;
      }
    }
    setStatus({ kind: "testing" });
    try {
      await sendChat(cfg, [{ role: "user", content: "ping" }]);
      setStatus({ kind: "ok" });
      saveConfig(cfg);
      setActive(cfg.label);
      setTimeout(() => {
        onOpenChange(false);
        setStatus({ kind: "idle" });
      }, 700);
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-glow/20 bg-card text-arctic">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-arctic">
            <span aria-hidden className="text-2xl">{preset.glyph}</span>
            Conectar {preset.label}
          </DialogTitle>
          <p className="text-[13px] text-mute">{preset.tagline}</p>
        </DialogHeader>

        <div className="space-y-4">
          {preset.needs.map((field) => {
            const isSecret = field.type === "password";
            return (
              <label key={field.key} className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mute">
                  {field.label}
                </span>
                <div className="relative">
                  <Input
                    type={isSecret && !showKey ? "password" : "text"}
                    value={values[field.key] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className={cn(
                      "h-10 border-glow/20 bg-abyss/60 text-sm text-arctic placeholder:text-mute/50 focus:border-glow/50",
                      isSecret && "pr-10 font-mono text-xs"
                    )}
                  />
                  {isSecret && (
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-mute transition-colors hover:text-arctic"
                      aria-label={showKey ? "Esconder" : "Mostrar"}
                    >
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                {field.hint && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-mute/85">{field.hint}</p>
                )}
              </label>
            );
          })}

          {preset.warning && (
            <div className="flex items-start gap-2 rounded-md border border-aurora/40 bg-aurora/5 p-3 text-[12px]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aurora" />
              <p className="text-arctic/85">{preset.warning}</p>
            </div>
          )}

          <p className="text-[11px] text-mute">
            Chave fica <strong>só no localStorage deste navegador</strong>. Nada é enviado
            pro backend do BrainFrost — o browser fala direto com o provedor.
          </p>

          {status.kind === "error" && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-200">
              {status.message}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md px-3 py-2 text-xs text-mute transition-colors hover:text-arctic"
            >
              cancelar
            </button>
            <button
              onClick={testAndSave}
              disabled={status.kind === "testing"}
              className="flex h-10 items-center gap-2 rounded-md border border-glow/40 bg-glow/10 px-4 text-sm text-arctic transition-colors hover:border-glow/70 disabled:opacity-60"
            >
              {status.kind === "testing" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> testando…
                </>
              ) : status.kind === "ok" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-glow" /> conectado
                </>
              ) : (
                "conectar"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
