"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface AccessPreview {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isPro: boolean;
  blocked: boolean;
}

interface AccessPreviewContextValue {
  preview: AccessPreview | null;
  startPreview: (preview: AccessPreview) => void;
  stopPreview: () => void;
}

const STORAGE_KEY = "brainfrost-admin-access-preview";
const AccessPreviewContext = createContext<AccessPreviewContextValue>({
  preview: null,
  startPreview: () => undefined,
  stopPreview: () => undefined,
});

export function AccessPreviewProvider({ children }: { children: React.ReactNode }) {
  const [preview, setPreview] = useState<AccessPreview | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setPreview(JSON.parse(saved) as AccessPreview);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const startPreview = useCallback((next: AccessPreview) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPreview(next);
  }, []);

  const stopPreview = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setPreview(null);
  }, []);

  const value = useMemo(() => ({ preview, startPreview, stopPreview }), [preview, startPreview, stopPreview]);
  return <AccessPreviewContext.Provider value={value}>{children}</AccessPreviewContext.Provider>;
}

export function AccessPreviewBanner() {
  const { preview, stopPreview } = useAccessPreview();
  if (!preview) return null;

  return (
    <div className="flex min-h-9 items-center justify-center gap-3 border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-center text-xs text-amber-950">
      <span>
        Visualizando o acesso de <strong>{preview.name || preview.email}</strong> — somente a interface; os dados continuam sendo os seus.
      </span>
      <button onClick={stopPreview} className="shrink-0 rounded-full border border-amber-400 px-3 py-1 font-semibold hover:bg-amber-100">
        Sair da visualização
      </button>
    </div>
  );
}

export const useAccessPreview = () => useContext(AccessPreviewContext);
