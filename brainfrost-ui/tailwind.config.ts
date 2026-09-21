import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: "#050E1A",
        deep: "#0A1A2F",
        rift: "#16324F",
        glow: "#5AD8FF",
        aurora: "#9BFFE4",
        arctic: "#E9F6FF",
        mute: "#7E9BB8",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        pane: "0 24px 60px -30px rgba(3, 10, 20, 0.95)",
      },
      keyframes: {
        drift: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        drift: "drift 320ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
