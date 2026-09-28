// Página de comparação — 10 direções pro mascote do BrainFrost.
// Não é rota final; some quando o dono escolher a direção.

import type { ReactNode } from "react";

const SIZE = 180;

const PALETTE = {
  ice: "#5CE6FF",
  icePale: "#B8F0FF",
  iceDeep: "#0EA5CF",
  frost: "#EBF7FF",
  night: "#0B1B30",
  outline: "#163756",
} as const;

interface Mascot {
  name: string;
  tagline: string;
  svg: ReactNode;
}

const MASCOTS: Mascot[] = [
  {
    name: "1 · Iglu",
    tagline: "O cérebro virou casa. Porta é o caminho pro conteúdo.",
    svg: (
      <>
        <defs>
          <linearGradient id="iglu-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={PALETTE.icePale} />
            <stop offset="1" stopColor={PALETTE.iceDeep} />
          </linearGradient>
        </defs>
        <path d="M20 130 A70 70 0 0 1 160 130 L160 150 L20 150 Z" fill="url(#iglu-body)" stroke={PALETTE.outline} strokeWidth="3" />
        <path d="M75 150 L75 110 A15 15 0 0 1 105 110 L105 150 Z" fill={PALETTE.night} />
        <path d="M40 100 L60 100 M70 80 L90 80 M110 80 L130 80 M50 120 L70 120 M120 120 L140 120" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <circle cx="60" cy="75" r="4" fill={PALETTE.night} />
        <circle cx="120" cy="75" r="4" fill={PALETTE.night} />
        <path d="M75 92 Q90 100 105 92" stroke={PALETTE.night} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: "2 · Blob Frost",
    tagline: "Estilo Claude, mas de gelo. Amigo, aconchegante, direto.",
    svg: (
      <>
        <defs>
          <radialGradient id="blob-body" cx="0.4" cy="0.35">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor={PALETTE.ice} />
          </radialGradient>
        </defs>
        <path
          d="M90 20 C140 20 160 60 155 100 C150 145 115 165 90 165 C55 165 30 140 30 100 C30 55 55 20 90 20 Z"
          fill="url(#blob-body)"
          stroke={PALETTE.outline}
          strokeWidth="3"
        />
        <ellipse cx="70" cy="90" rx="5" ry="7" fill={PALETTE.night} />
        <ellipse cx="112" cy="90" rx="5" ry="7" fill={PALETTE.night} />
        <path d="M75 115 Q91 128 108 115" stroke={PALETTE.night} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="55" cy="70" r="3" fill="#fff" opacity="0.9" />
      </>
    ),
  },
  {
    name: "3 · Floco humanizado",
    tagline: "O ícone atual do produto ganha rosto. Amarra 100% com a marca.",
    svg: (
      <>
        <g stroke={PALETTE.iceDeep} strokeWidth="6" strokeLinecap="round" fill="none">
          <line x1="90" y1="30" x2="90" y2="150" />
          <line x1="35" y1="90" x2="145" y2="90" />
          <line x1="50" y1="50" x2="130" y2="130" />
          <line x1="130" y1="50" x2="50" y2="130" />
        </g>
        <g stroke={PALETTE.iceDeep} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M90 30 L82 42 M90 30 L98 42" />
          <path d="M90 150 L82 138 M90 150 L98 138" />
          <path d="M35 90 L47 82 M35 90 L47 98" />
          <path d="M145 90 L133 82 M145 90 L133 98" />
        </g>
        <circle cx="90" cy="90" r="20" fill={PALETTE.frost} stroke={PALETTE.outline} strokeWidth="2.5" />
        <circle cx="83" cy="87" r="2.5" fill={PALETTE.night} />
        <circle cx="97" cy="87" r="2.5" fill={PALETTE.night} />
        <path d="M84 96 Q90 100 96 96" stroke={PALETTE.night} strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: "4 · Cristal geométrico",
    tagline: "Poliedro isométrico. Facetas refletem tema tech-frio.",
    svg: (
      <>
        <defs>
          <linearGradient id="crystal-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={PALETTE.icePale} />
            <stop offset="1" stopColor={PALETTE.iceDeep} />
          </linearGradient>
          <linearGradient id="crystal-right" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor={PALETTE.ice} />
          </linearGradient>
        </defs>
        <path d="M90 25 L40 80 L90 160 L90 90 Z" fill="url(#crystal-left)" stroke={PALETTE.outline} strokeWidth="2.5" />
        <path d="M90 25 L140 80 L90 160 L90 90 Z" fill="url(#crystal-right)" stroke={PALETTE.outline} strokeWidth="2.5" />
        <path d="M40 80 L90 90 L140 80" fill="none" stroke={PALETTE.outline} strokeWidth="2" />
        <circle cx="75" cy="95" r="3" fill={PALETTE.night} />
        <circle cx="105" cy="95" r="3" fill={PALETTE.night} />
        <path d="M78 115 Q90 122 102 115" stroke={PALETTE.night} strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: "5 · Cérebro no gelo",
    tagline: "Literal: cérebro dentro de bolha de gelo. Direto ao ponto.",
    svg: (
      <>
        <circle cx="90" cy="90" r="70" fill={PALETTE.icePale} opacity="0.5" stroke={PALETTE.iceDeep} strokeWidth="2" />
        <path
          d="M55 90 Q55 60 75 60 Q80 45 95 55 Q115 50 120 70 Q135 75 125 100 Q130 120 105 120 Q95 130 80 120 Q60 125 55 105 Q45 100 55 90 Z"
          fill="#fff"
          stroke={PALETTE.outline}
          strokeWidth="2.5"
        />
        <path
          d="M90 55 L90 125 M75 70 Q85 80 75 90 Q85 100 75 110 M105 70 Q95 80 105 90 Q95 100 105 110"
          stroke={PALETTE.iceDeep}
          strokeWidth="1.8"
          fill="none"
          opacity="0.6"
        />
        <circle cx="78" cy="82" r="3" fill={PALETTE.night} />
        <circle cx="102" cy="82" r="3" fill={PALETTE.night} />
        <path d="M55 145 L57 152 M90 155 L90 162 M125 145 L123 152" stroke={PALETTE.iceDeep} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </>
    ),
  },
  {
    name: "6 · Pinguinho",
    tagline: "Clássico do gelo. Máxima fofura, mínimo risco.",
    svg: (
      <>
        <ellipse cx="90" cy="105" rx="55" ry="60" fill={PALETTE.night} stroke={PALETTE.outline} strokeWidth="2" />
        <ellipse cx="90" cy="115" rx="35" ry="45" fill={PALETTE.frost} />
        <ellipse cx="72" cy="82" rx="8" ry="10" fill="#fff" />
        <ellipse cx="108" cy="82" rx="8" ry="10" fill="#fff" />
        <circle cx="73" cy="85" r="3" fill={PALETTE.night} />
        <circle cx="107" cy="85" r="3" fill={PALETTE.night} />
        <path d="M85 95 L90 105 L95 95 Z" fill="#F5A524" stroke={PALETTE.outline} strokeWidth="1" />
        <ellipse cx="65" cy="160" rx="10" ry="5" fill="#F5A524" />
        <ellipse cx="115" cy="160" rx="10" ry="5" fill="#F5A524" />
      </>
    ),
  },
  {
    name: "7 · Fantasminha ice",
    tagline: "Blob-fantasma leve, translúcido, brincalhão.",
    svg: (
      <>
        <path
          d="M90 20 C125 20 140 50 140 90 L140 155 L125 145 L110 155 L95 145 L80 155 L65 145 L50 155 L50 90 C50 50 60 20 90 20 Z"
          fill={PALETTE.icePale}
          stroke={PALETTE.outline}
          strokeWidth="3"
        />
        <ellipse cx="75" cy="80" rx="6" ry="8" fill={PALETTE.night} />
        <ellipse cx="105" cy="80" rx="6" ry="8" fill={PALETTE.night} />
        <ellipse cx="90" cy="105" rx="8" ry="5" fill={PALETTE.night} />
        <circle cx="65" cy="70" r="2" fill="#fff" />
        <circle cx="115" cy="70" r="2" fill="#fff" />
      </>
    ),
  },
  {
    name: "8 · Cubo de gelo",
    tagline: "Camadas empilhadas viram cubo. Bom pra loading/thinking.",
    svg: (
      <>
        <defs>
          <linearGradient id="cube-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor={PALETTE.icePale} />
          </linearGradient>
        </defs>
        <path d="M40 65 L90 40 L140 65 L90 90 Z" fill="url(#cube-top)" stroke={PALETTE.outline} strokeWidth="2" />
        <path d="M40 65 L40 130 L90 155 L90 90 Z" fill={PALETTE.ice} stroke={PALETTE.outline} strokeWidth="2" />
        <path d="M140 65 L140 130 L90 155 L90 90 Z" fill={PALETTE.iceDeep} stroke={PALETTE.outline} strokeWidth="2" />
        <circle cx="65" cy="100" r="4" fill={PALETTE.night} />
        <circle cx="115" cy="100" r="4" fill={PALETTE.night} />
        <path d="M70 120 Q90 130 110 120" stroke={PALETTE.night} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: "9 · Nuvem congelada",
    tagline: "Contexto que paira. Nuvem tech + neve caindo.",
    svg: (
      <>
        <path
          d="M45 100 A20 20 0 0 1 65 80 A25 25 0 0 1 115 75 A20 20 0 0 1 140 100 A15 15 0 0 1 130 125 L55 125 A15 15 0 0 1 45 100 Z"
          fill={PALETTE.frost}
          stroke={PALETTE.outline}
          strokeWidth="3"
        />
        <circle cx="75" cy="105" r="4" fill={PALETTE.night} />
        <circle cx="105" cy="105" r="4" fill={PALETTE.night} />
        <path d="M78 118 Q90 125 102 118" stroke={PALETTE.night} strokeWidth="2" fill="none" strokeLinecap="round" />
        <g stroke={PALETTE.iceDeep} strokeWidth="2" strokeLinecap="round">
          <path d="M65 140 L65 148 M60 144 L70 144" />
          <path d="M90 145 L90 155 M85 150 L95 150" />
          <path d="M115 138 L115 148 M110 143 L120 143" />
        </g>
      </>
    ),
  },
  {
    name: "10 · Yetinho",
    tagline: "Peludo, fofo, com traço de mistério. Bom pra brand story.",
    svg: (
      <>
        <path
          d="M50 90 Q50 45 90 45 Q130 45 130 90 L130 140 Q130 160 90 160 Q50 160 50 140 Z"
          fill={PALETTE.frost}
          stroke={PALETTE.outline}
          strokeWidth="3"
        />
        <path
          d="M50 55 Q55 50 60 55 Q65 50 70 55 Q75 50 80 55 Q85 50 90 55 Q95 50 100 55 Q105 50 110 55 Q115 50 120 55 Q125 50 130 55"
          fill="none"
          stroke={PALETTE.iceDeep}
          strokeWidth="2.5"
        />
        <ellipse cx="75" cy="85" rx="5" ry="7" fill={PALETTE.night} />
        <ellipse cx="105" cy="85" rx="5" ry="7" fill={PALETTE.night} />
        <path d="M80 105 Q90 112 100 105" stroke={PALETTE.night} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="65" cy="120" r="3" fill={PALETTE.ice} opacity="0.5" />
        <circle cx="115" cy="120" r="3" fill={PALETTE.ice} opacity="0.5" />
      </>
    ),
  },
];

export default function MascotesPage() {
  return (
    <div className="min-h-[100dvh] bg-[#050E1A] px-6 py-16 text-[#EBF7FF]">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-[36px] font-semibold tracking-tight">
          Mascotes — 10 direções
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-[#8199B0]">
          Página temporária pra você comparar direções e escolher. Depois que
          você escolher, apago essa rota e aprofundo só o vencedor
          (variações de pose, empty state, loading, hover).
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MASCOTS.map((m) => (
            <div
              key={m.name}
              className="rounded-2xl border border-[#163756] bg-[#0A1A2E] p-6"
            >
              <div className="flex items-center justify-center rounded-xl bg-[#EBF7FF]/5 py-6">
                <svg
                  width={SIZE}
                  height={SIZE}
                  viewBox="0 0 180 180"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {m.svg}
                </svg>
              </div>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[#5CE6FF]">
                {m.name}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#EBF7FF]/85">
                {m.tagline}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-16 text-[12px] text-[#8199B0]">
          Todos em SVG puro. Palette shared. Depois de eleger o vencedor, refino
          curvas, adiciono gradients extras e crio 3–5 poses.
        </p>
      </div>
    </div>
  );
}
