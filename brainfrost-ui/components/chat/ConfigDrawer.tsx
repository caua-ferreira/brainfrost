"use client";

import { useState } from "react";
import { AlertTriangle, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CHAT_PRESETS, sendChat, type ChatApi, type ChatConfig } from "@/lib/chat-client";
import { useChatStore } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Config existente para editar; null pra criar nova. */
  editing?: ChatConfig | null;
}

type Status = { kind: "idle" } | { kind: "testing" } | { kind: "ok" } | { kind: "error"; message: string };

export function ConfigDrawer({ open, onOpenChange, editing }: Props) {
  const saveConfig = useChatStore((s) => s.saveConfig);
  const setActive = useChatStore((s) => s.setActiveConfig);

  const [presetKey, setPresetKey] = useState<string>(editing ? "custom" : "openrouter");
  const [label, setLabel] = useState(editing?.label ?? "");
  const [api, setApi] = useState<ChatApi>(editing?.api ?? "openai");
  const [url, setUrl] = useState(editing?.url ?? "");
  const [model, setModel] = useState(editing?.model ?? "");
  const [apiKey, setApiKey] = useState(editing?.apiKey ?? "");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function applyPreset(key: string) {
    setPresetKey(key);
    const preset = CHAT_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setApi(preset.api);
    setUrl(preset.url);
    setModel(preset.model);
    if (!label) setLabel(preset.label);
  }

  async function testAndSave() {
    if (!label.trim() || !url.trim() || !model.trim()) {
      setStatus({ kind: "error", message: "Preencha nome, URL e modelo." });
      return;
    }
    const preset = CHAT_PRESETS.find((p) => p.key === presetKey);
    const config: ChatConfig = {
      label: label.trim(),
      api,
      url: url.trim(),
      model: model.trim(),
      apiKey: apiKey.trim(),
      headers: preset?.headers,
      dangerouslyAllowBrowser: preset?.dangerouslyAllowBrowser,
    };
    setStatus({ kind: "testing" });
    try {
      await sendChat(config, [{ role: "user", content: "ping" }]);
      setStatus({ kind: "ok" });
      saveConfig(config);
      setActive(config.label);
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

  const currentPreset = CHAT_PRESETS.find((p) => p.key === presetKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-glow/20 bg-card text-arctic">
        <DialogHeader>
          <DialogTitle className="text-arctic">Conectar uma LLM</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-aurora/40 bg-aurora/5 p-3 text-[12px]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aurora" />
            <p className="text-arctic/85">
              Sua chave fica <strong>só no localStorage deste navegador</strong>. Nada é
              enviado pro backend do BrainFrost — o browser fala direto com o provedor.
              Não use em máquina compartilhada.
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mute">
              preset
            </span>
            <select
              value={presetKey}
              onChange={(e) => applyPreset(e.target.value)}
              className="h-9 w-full rounded-md border border-glow/20 bg-abyss/60 px-2 text-sm text-arctic focus:border-glow/50 focus:outline-none"
            >
              {CHAT_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            {currentPreset && (
              <p
                className={cn(
                  "mt-1.5 text-[11px]",
                  currentPreset.browserFriendly ? "text-mute" : "text-aurora/85"
                )}
              >
                {currentPreset.hint}
              </p>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Field label="nome (label)">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="OpenRouter Claude"
                className="h-9 border-glow/20 bg-abyss/60 text-sm"
              />
            </Field>
            <Field label="api">
              <select
                value={api}
                onChange={(e) => setApi(e.target.value as ChatApi)}
                className="h-9 w-full rounded-md border border-glow/20 bg-abyss/60 px-2 text-sm text-arctic focus:border-glow/50 focus:outline-none"
              >
                <option value="openai">openai</option>
                <option value="anthropic">anthropic</option>
                <option value="ollama">ollama</option>
                <option value="openrouter">openrouter</option>
              </select>
            </Field>
          </div>

          <Field label="url">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1/chat/completions"
              className="h-9 border-glow/20 bg-abyss/60 font-mono text-xs"
            />
          </Field>

          <Field label="modelo">
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="anthropic/claude-sonnet-4.5"
              className="h-9 border-glow/20 bg-abyss/60 font-mono text-xs"
            />
          </Field>

          <Field label="chave (fica só no browser)">
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-..."
                className="h-9 border-glow/20 bg-abyss/60 pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-mute transition-colors hover:text-arctic"
                aria-label={showKey ? "Esconder chave" : "Mostrar chave"}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </Field>

          {status.kind === "error" && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-200">
              {status.message}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md px-3 py-2 text-xs text-mute transition-colors hover:text-arctic"
            >
              cancelar
            </button>
            <button
              onClick={testAndSave}
              disabled={status.kind === "testing"}
              className="flex items-center gap-2 rounded-md border border-glow/40 bg-glow/10 px-3 py-2 text-xs text-arctic transition-colors hover:border-glow/70 disabled:opacity-60"
            >
              {status.kind === "testing" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> testando…
                </>
              ) : status.kind === "ok" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-glow" /> salvo
                </>
              ) : (
                "testar e salvar"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mute">
        {label}
      </span>
      {children}
    </label>
  );
}
