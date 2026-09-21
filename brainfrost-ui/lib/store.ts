import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Preferências do grafo — o usuário calibra e o navegador lembra entre visitas.
 * Nomes intuitivos (spacing, showLabels) em vez do jargão de física do d3.
 * O GraphCanvas traduz esses valores para forceStrength/linkDistance.
 */
interface GraphPrefs {
  /** 0 a 100 — quanto maior, mais afastados ficam os nós. */
  spacing: number;
  /** Se true, rótulos aparecem em qualquer zoom. */
  showLabels: boolean;
  set: (patch: Partial<Omit<GraphPrefs, "set" | "reset">>) => void;
  reset: () => void;
}

const DEFAULTS = {
  spacing: 55,
  showLabels: true,
};

export const useGraphPrefs = create<GraphPrefs>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: "brainfrost.graph.v1" }
  )
);
