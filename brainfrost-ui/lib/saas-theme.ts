import type { Theme } from "./saas-mock";

export const PALETTES = {
  dark: {
    bg: "#050E1A",
    bgSoft: "#08182A",
    card: "#0A1826",
    border: "rgba(92, 230, 255, 0.10)",
    borderSoft: "rgba(92, 230, 255, 0.05)",
    text: "#EBF7FF",
    dim: "#8199B0",
    accent: "#5CE6FF",
    aurora: "#99FFDD",
    onAccent: "#050E1A",
  },
  light: {
    bg: "#F0F5FA",
    bgSoft: "#E5EEF5",
    card: "#FFFFFF",
    border: "rgba(8, 36, 58, 0.10)",
    borderSoft: "rgba(8, 36, 58, 0.05)",
    text: "#08243A",
    dim: "#6480A0",
    accent: "#0B7CA8",
    aurora: "#0FB39A",
    onAccent: "#FFFFFF",
  },
} as const;

export type Palette = (typeof PALETTES)[Theme];
export const palette = (theme: Theme): Palette => PALETTES[theme];
