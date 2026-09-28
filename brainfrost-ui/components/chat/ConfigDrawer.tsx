"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { sendChat, type ChatConfig, type ProviderPreset } from "@/lib/chat-client";
import { useChatStore } from "@/lib/chat-store";
import { cn } from "@/lib/utils";
import { ProviderLogo } from "./ProviderLogo";

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
  const deleteConfig = useChatStore((s) => s.deleteConfig);
  const setActive = useChatStore((s) => s.setActiveConfig);
  const storedConfigs = useChatStore((s) => s.configs);

  const [values, setValues] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState(false);
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (open && preset) {
      const existing = storedConfigs.find((config) => config.label === preset.label);
      setValues({
        url: existing?.url ?? preset.url,
        model: existing?.model ?? preset.model,
        apiKey: "",
        extraKey: "",
      });
      setSaveToAccount(existing?.storage === "account" || preset.needs.some((field) => field.key === "apiKey"));
      setStatus({ kind: "idle" });
      setShowKey(false);
    }
  }, [open, preset, storedConfigs]);

  if (!preset) return null;

  async function testAndSave() {
    if (!preset) return;
    const existing = storedConfigs.find((config) => config.label === preset.label);
    const enteredApiKey = values.apiKey?.trim() ?? "";
    const enteredExtraKey = values.extraKey?.trim() ?? "";
    const accountApiKey = enteredApiKey || (existing?.storage === "account" ? "" : existing?.apiKey ?? "");
    const accountExtraKey = enteredExtraKey || (existing?.storage === "account" ? "" : existing?.extraKey ?? "");
    const requiresSecret = preset.needs.some(
      (field) => field.key === "apiKey" || field.key === "extraKey"
    );

    const cfg: ChatConfig = {
      label: preset.label,
      api: preset.api,
      url: values.url || preset.url,
      model: values.model || preset.model,
      apiKey: enteredApiKey || existing?.apiKey || "",
      extraKey: enteredExtraKey || existing?.extraKey || undefined,
      headers: preset.headers,
      dangerouslyAllowBrowser: preset.dangerouslyAllowBrowser,
    };
    for (const field of preset.needs) {
      const v = (values[field.key] ?? "").trim() ||
        (field.key === "apiKey" ? existing?.apiKey ?? "" : existing?.extraKey ?? "");
      if (!v) {
        setStatus({ kind: "error", message: `Preencha "${field.label}".` });
        return;
      }
    }
    if (saveToAccount && requiresSecret && preset.api === "webllm") {
      setStatus({ kind: "error", message: "O modelo local deve ficar somente neste navegador." });
      return;
    }

    setStatus({ kind: "testing" });
    try {
      // Ao substituir uma chave, testa a nova credencial diretamente antes de
      // gravá-la. Para uma config da conta já existente, deixar em branco
      // significa manter a chave protegida e apenas atualizar os metadados.
      if (enteredApiKey || enteredExtraKey || !existing?.hasApiKey) {
        await sendChat({ ...cfg, storage: "browser" }, [{ role: "user", content: "ping" }]);
      }

      if (saveToAccount && requiresSecret) {
        const response = await fetch("/api/chat/configs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            provider_key: preset.key,
            label: cfg.label,
            api: cfg.api,
            url: cfg.url,
            model: cfg.model,
            ...(accountApiKey ? { api_key: accountApiKey } : {}),
            ...(accountExtraKey ? { extra_key: accountExtraKey } : {}),
            headers: cfg.headers,
            dangerously_allow_browser: cfg.dangerouslyAllowBrowser,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar a chave na conta.");
        saveConfig(result.config as ChatConfig);
        setActive(preset.label);
      } else {
        saveConfig({ ...cfg, storage: "browser", providerKey: undefined, hasApiKey: !!cfg.apiKey });
        setActive(cfg.label);
      }

      setStatus({ kind: "ok" });
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

  async function removeAccountCredential() {
    if (!preset || !confirm(`Remover a chave salva do ${preset.label}?`)) return;
    setStatus({ kind: "testing" });
    try {
      const response = await fetch(`/api/chat/configs?provider_key=${encodeURIComponent(preset.key)}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Não foi possível remover a chave.");
      deleteConfig(preset.label);
      setStatus({ kind: "ok" });
      setTimeout(() => onOpenChange(false), 500);
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-primary/20 bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ProviderLogo preset={preset} size={24} />
            Conectar {preset.label}
          </DialogTitle>
          <p className="text-[13px] text-muted-foreground">{preset.tagline}</p>
        </DialogHeader>

        <div className="space-y-4">
          {preset.needs.map((field) => {
            const isSecret = field.type === "password";
            return (
              <label key={field.key} className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
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
                      "h-10 border-primary/20 bg-background/60 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50",
                      isSecret && "pr-10 font-mono text-xs"
                    )}
                  />
                  {isSecret && (
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showKey ? "Esconder" : "Mostrar"}
                    >
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                {field.hint && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{field.hint}</p>
                )}
              </label>
            );
          })}

          {preset.warning && (
            <div className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/5 p-3 text-[12px]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <p className="text-foreground/85">{preset.warning}</p>
            </div>
          )}

          {preset.needs.some((field) => field.key === "apiKey" || field.key === "extraKey") ? (
            <div className="space-y-2 rounded-lg border border-primary/15 bg-primary/5 p-3 text-[11px] text-muted-foreground">
              <label className="flex cursor-pointer items-start gap-2 text-foreground">
                <input
                  type="checkbox"
                  checked={saveToAccount}
                  onChange={(event) => setSaveToAccount(event.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <span>
                  <strong>Salvar nesta conta</strong> (recomendado)
                  <span className="mt-0.5 block text-muted-foreground">
                    A chave fica criptografada no BrainFrost e não volta para a tela.
                  </span>
                </span>
              </label>
              {!saveToAccount && (
                <p>Usando somente neste navegador. Você precisará cadastrar novamente em outro dispositivo.</p>
              )}
              {saveToAccount && storedConfigs.some((config) => config.label === preset.label && config.storage === "account") && (
                <p>Já existe uma chave salva. Deixe o campo vazio para mantê-la.</p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Este provedor roda localmente e fica somente neste navegador.
            </p>
          )}

          {status.kind === "error" && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-200">
              {status.message}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            {saveToAccount && storedConfigs.some((config) => config.label === preset.label && config.storage === "account") && (
              <button
                type="button"
                onClick={removeAccountCredential}
                disabled={status.kind === "testing"}
                className="mr-auto flex items-center gap-1.5 rounded-md px-2 py-2 text-xs text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> remover chave
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              cancelar
            </button>
            <button
              onClick={testAndSave}
              disabled={status.kind === "testing"}
              className="flex h-10 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 text-sm text-foreground transition-colors hover:border-primary/70 disabled:opacity-60"
            >
              {status.kind === "testing" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> testando…
                </>
              ) : status.kind === "ok" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-primary" /> conectado
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
