"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, Download, Settings2, Trash2, UserRound } from "lucide-react";
import { useSession } from "@/components/saas/SessionProvider";
import { LinkedAccounts } from "@/components/saas/LinkedAccounts";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { getSupabase } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProfileStatus = { type: "ok" | "error"; message: string } | null;

function metadataValue(metadata: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function initialsFor(name: string, email: string) {
  const source = name.trim() || email.trim() || "Você";
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PerfilPage() {
  const router = useRouter();
  const theme = useSaas((s) => s.theme);
  const c = palette(theme);
  const { session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ProfileStatus>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session) return;
    const metadata = session.user.user_metadata ?? {};
    const identity = session.user.identities?.[0]?.identity_data ?? {};
    const displayName =
      metadataValue(metadata, "display_name", "full_name", "name") ||
      metadataValue(identity, "full_name", "name") ||
      session.user.email ||
      "";
    setName(displayName);
    setEmail(session.user.email ?? "");
    setAddress(metadataValue(metadata, "address"));
    setAvatarUrl(
      metadataValue(metadata, "avatar_url", "picture") ||
        metadataValue(identity, "avatar_url", "picture")
    );
    setAvatarFile(null);
    setPreviewUrl(null);
    setStatus(null);
  }, [session]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const initials = useMemo(() => initialsFor(name, email), [name, email]);
  const visibleAvatar = previewUrl ?? avatarUrl;

  if (!session) return null;

  const selectAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", message: "Escolha uma imagem válida." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: "error", message: "A foto precisa ter no máximo 2 MB." });
      return;
    }
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStatus(null);
  };

  const save = async () => {
    const nextName = name.trim();
    const nextEmail = email.trim();
    const nextAddress = address.trim();
    if (!nextName) {
      setStatus({ type: "error", message: "Informe seu nome." });
      return;
    }
    if (!nextEmail || !nextEmail.includes("@")) {
      setStatus({ type: "error", message: "Informe um e-mail válido." });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      let nextAvatarUrl = avatarUrl;
      if (avatarFile) {
        const supabase = getSupabase();
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(`${session.user.id}/avatar`, avatarFile, {
            upsert: true,
            contentType: avatarFile.type,
            cacheControl: "3600",
          });
        if (uploadError) throw new Error(`Não foi possível enviar a foto: ${uploadError.message}`);
        nextAvatarUrl = `${supabase.storage.from("avatars").getPublicUrl(`${session.user.id}/avatar`).data.publicUrl}?v=${Date.now()}`;
      }

      const { error } = await getSupabase().auth.updateUser({
        email: nextEmail,
        data: {
          ...session.user.user_metadata,
          display_name: nextName,
          full_name: nextName,
          address: nextAddress,
          avatar_url: nextAvatarUrl,
        },
      });
      if (error) throw error;

      const emailChanged = nextEmail.toLowerCase() !== (session.user.email ?? "").toLowerCase();
      setAvatarUrl(nextAvatarUrl);
      setAvatarFile(null);
      setPreviewUrl(null);
      setStatus({
        type: "ok",
        message: emailChanged
          ? "Perfil salvo. Confirme o novo e-mail na sua caixa de entrada."
          : "Perfil atualizado.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Não foi possível salvar o perfil.",
      });
    } finally {
      setSaving(false);
    }
  };

  const exportAccount = async () => {
    setExporting(true);
    setStatus(null);
    try {
      const response = await fetch("/api/account/export", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Não foi possível exportar seus dados.");

      try {
        const localChat = JSON.parse(localStorage.getItem("brainfrost.chat.v1") ?? "null") as {
          state?: { sessions?: unknown[] };
        } | null;
        payload.browserLocalData = {
          chatSessions: localChat?.state?.sessions ?? [],
          notice: "Conversas ficam somente neste navegador e foram anexadas por ele.",
        };
      } catch {
        payload.browserLocalData = { chatSessions: [], notice: "Nenhuma conversa local pôde ser anexada." };
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `brainfrost-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus({ type: "ok", message: "Seus dados foram exportados." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível exportar seus dados." });
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== "EXCLUIR") return;
    setDeleting(true);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Não foi possível excluir sua conta.");
      localStorage.removeItem("brainfrost.chat.v1");
      await getSupabase().auth.signOut().catch(() => undefined);
      router.replace("/");
      router.refresh();
    } catch (error) {
      setDeleteOpen(false);
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível excluir sua conta." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden" style={{ background: c.bg }}>
      <div className="pointer-events-none absolute -right-32 top-0 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: c.accent, opacity: 0.1 }} />
      <div className="pointer-events-none absolute -left-32 top-72 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: c.aurora, opacity: 0.07 }} />

      <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.accent }}>
          conta e perfil
        </p>
        <h1 className="mt-3 text-[42px] font-semibold leading-[1.02] tracking-tight md:text-[56px]" style={{ color: c.text }}>
          Seu perfil,
          <br />
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${c.accent}, ${c.aurora})` }}>
            do seu jeito.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed" style={{ color: c.dim }}>
          Atualize seus dados de conta e a foto que aparece no BrainFrost.
          As contas conectadas ficam aqui. Provedores, chaves de API e análise profunda continuam em Configurações.
        </p>

        <section className="mt-12 rounded-2xl border p-6" style={{ background: c.card, borderColor: c.border }}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 font-mono text-2xl font-semibold" style={{ background: `${c.accent}18`, borderColor: c.accent, color: c.accent }}>
              {visibleAvatar ? (
                <img src={visibleAvatar} alt={name || "Sua foto"} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white text-slate-800 shadow-sm transition-transform hover:scale-105"
                aria-label="Trocar foto de perfil"
              >
                <Camera className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div>
              <p className="text-[17px] font-semibold" style={{ color: c.text }}>{name || "Seu nome"}</p>
              <p className="mt-1 font-mono text-[11px]" style={{ color: c.dim }}>{session.user.email}</p>
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 rounded-full border px-4 py-1.5 text-[12px] font-medium" style={{ borderColor: c.borderSoft, color: c.text }}>
                trocar foto
              </button>
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => selectAvatar(event.target.files?.[0])} />
              <p className="mt-2 font-mono text-[10px]" style={{ color: c.dim }}>PNG, JPG ou WebP · até 2 MB</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Field label="Nome" value={name} onChange={setName} placeholder="Como quer ser chamado" c={c} />
            <Field label="E-mail" value={email} onChange={setEmail} type="email" placeholder="voce@exemplo.com" c={c} />
            <div className="md:col-span-2">
              <Field label="Endereço" value={address} onChange={setAddress} placeholder="Rua, número, cidade e estado (opcional)" c={c} />
            </div>
          </div>

          {status && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border p-3 font-mono text-[11px]" style={{ borderColor: status.type === "ok" ? `${c.aurora}66` : "#c2415a66", background: status.type === "ok" ? `${c.aurora}12` : "#c2415a12", color: status.type === "ok" ? c.aurora : "#c2415a" }}>
              {status.type === "ok" && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
              {status.message}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button type="button" onClick={save} disabled={saving} className="rounded-full px-6 py-2.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50" style={{ background: c.accent, color: c.onAccent }}>
              {saving ? "salvando…" : "salvar perfil"}
            </button>
          </div>
        </section>

        <LinkedAccounts />

        <section className="mt-8 flex items-center justify-between gap-4 rounded-2xl border p-5" style={{ background: c.card, borderColor: c.border }}>
          <div className="flex items-start gap-3">
            <UserRound className="mt-0.5 h-5 w-5" style={{ color: c.accent }} />
            <div>
              <p className="text-[14px] font-semibold" style={{ color: c.text }}>Contas, provedores e análise</p>
              <p className="mt-1 text-[12px] leading-relaxed" style={{ color: c.dim }}>Conecte Google, GitHub e Microsoft, gerencie chaves de API e escolha a análise profunda.</p>
            </div>
          </div>
          <Link href="/config" className="flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-medium" style={{ borderColor: c.borderSoft, color: c.text }}>
            <Settings2 className="h-3.5 w-3.5" />
            Configurações
          </Link>
        </section>

        <section className="mt-8 rounded-2xl border p-5" style={{ background: c.card, borderColor: c.border }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: c.dim }}>seus dados</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-semibold" style={{ color: c.text }}>Baixar uma cópia</p>
              <p className="mt-1 max-w-lg text-[12px] leading-relaxed" style={{ color: c.dim }}>Exporta perfil, cérebro, importações, sugestões e conversas deste navegador em JSON. Segredos nunca entram no arquivo.</p>
            </div>
            <button type="button" onClick={exportAccount} disabled={exporting} className="flex shrink-0 items-center justify-center gap-2 rounded-full border px-4 py-2 text-[12px] font-medium disabled:opacity-50" style={{ borderColor: c.borderSoft, color: c.text }}>
              <Download className="h-3.5 w-3.5" />
              {exporting ? "preparando…" : "exportar dados"}
            </button>
          </div>

          <div className="my-5 h-px" style={{ background: c.border }} />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-semibold text-red-600">Excluir conta</p>
              <p className="mt-1 max-w-lg text-[12px] leading-relaxed" style={{ color: c.dim }}>Cancela uma assinatura ativa e remove permanentemente seu perfil e os dados do BrainFrost. Registros fiscais do Stripe podem ser mantidos quando exigidos por lei.</p>
            </div>
            <button type="button" onClick={() => { setDeleteConfirmation(""); setDeleteOpen(true); }} className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-red-300 px-4 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" />
              excluir conta
            </button>
          </div>
        </section>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir sua conta permanentemente?</DialogTitle>
            <DialogDescription>Essa ação cancela sua assinatura e apaga o seu cérebro, importações, configurações e perfil. Faça uma exportação antes se quiser guardar uma cópia.</DialogDescription>
          </DialogHeader>
          <label className="block text-[12px] text-muted-foreground">
            Digite <strong className="text-foreground">EXCLUIR</strong> para confirmar
            <input autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-red-300" />
          </label>
          <DialogFooter>
            <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-full border border-border px-5 py-2 text-[13px]">cancelar</button>
            <button type="button" onClick={deleteAccount} disabled={deleting || deleteConfirmation !== "EXCLUIR"} className="rounded-full bg-red-600 px-5 py-2 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
              {deleting ? "excluindo…" : "excluir definitivamente"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  c,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  c: ReturnType<typeof palette>;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: c.dim }}>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full rounded-xl border px-3 text-[13px] outline-none focus:ring-2" style={{ background: c.bgSoft, borderColor: c.borderSoft, color: c.text }} />
    </label>
  );
}
