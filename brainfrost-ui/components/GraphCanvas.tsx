"use client";

import dynamic from "next/dynamic";
import { forceCollide } from "d3-force";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphData, GraphNode } from "@/lib/types";
import { useGraphPrefs } from "@/lib/store";
import { GraphControls } from "./GraphControls";

// force-graph desenha em canvas e toca em `window`: só pode entrar no cliente.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center font-mono text-xs text-mute">
      formando o gelo…
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

interface Props {
  data: GraphData;
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

interface RenderNode extends GraphNode {
  x: number;
  y: number;
}

const GLOW = "90, 216, 255";
const AURORA = "155, 255, 228";

/**
 * O slider vai de 0 (compacto) a 100 (aberto). Traduzimos aqui para as três
 * forças que importam: repulsão entre nós, comprimento dos links e raio
 * mínimo de colisão. Fazer o slider falar de "espaço" em vez de "charge"
 * evita expor o jargão do d3 na UI.
 */
function forceParams(spacing: number) {
  return {
    charge: -120 - spacing * 8,
    linkDistance: 60 + spacing * 1.6,
    collisionPad: 4 + spacing * 0.08,
  };
}

export default function GraphCanvas({ data, selected, onSelect }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState<string | null>(null);

  const spacing = useGraphPrefs((s) => s.spacing);
  const showLabels = useGraphPrefs((s) => s.showLabels);
  const dimByAge = useGraphPrefs((s) => s.dimByAge);

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A cópia é necessária: o force-graph escreve x/y direto nos objetos que recebe.
  const graph = useMemo(
    () => ({
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.links.map((link) => ({ ...link })),
    }),
    [data]
  );

  const focus = hovered ?? selected;

  const neighbours = useMemo(() => {
    if (!focus) return null;
    const set = new Set<string>([focus]);
    for (const link of data.links) {
      const source = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
      const target = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
      if (source === focus) set.add(target);
      if (target === focus) set.add(source);
    }
    return set;
  }, [focus, data.links]);

  // Raio maior escala visualmente o peso dos nós no cofre atual (11 camadas).
  const radius = useCallback((node: GraphNode) => 7 + Math.sqrt(node.degree) * 3.6, []);

  // Decay linear entre 7 e 120 dias: fresco brilha inteiro, velho cai a 35%.
  // A curva é sutil de propósito — só quer sugerir "isto está esfriando", não esconder.
  const ageFactor = useCallback(
    (updatedAt: string) => {
      if (!dimByAge) return 1;
      const days = (Date.now() - new Date(updatedAt).getTime()) / 86_400_000;
      if (!Number.isFinite(days) || days < 7) return 1;
      if (days > 120) return 0.35;
      return 1 - ((days - 7) / 113) * 0.65;
    },
    [dimByAge]
  );

  // Aplica as três forças toda vez que o slider muda, mantendo o layout vivo.
  useEffect(() => {
    if (!graphRef.current) return;
    const { charge, linkDistance, collisionPad } = forceParams(spacing);
    graphRef.current.d3Force("charge")?.strength(charge);
    graphRef.current.d3Force("link")?.distance(linkDistance);
    // forceCollide evita sobreposição — o parâmetro é o raio de exclusão do nó.
    graphRef.current.d3Force(
      "collide",
      forceCollide<RenderNode>((node) => radius(node) + collisionPad)
    );
    graphRef.current.d3ReheatSimulation();
  }, [spacing, radius, size.width]);

  useEffect(() => {
    if (!selected || !graphRef.current) return;
    const node = graph.nodes.find((n) => n.id === selected) as RenderNode | undefined;
    if (node?.x !== undefined) graphRef.current.centerAt(node.x, node.y, 600);
  }, [selected, graph.nodes]);

  const recenter = useCallback(() => {
    graphRef.current?.zoomToFit(500, 80);
  }, []);

  const paintNode = useCallback(
    (node: RenderNode, ctx: CanvasRenderingContext2D, scale: number) => {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
      const r = radius(node);
      const dimmed = neighbours ? !neighbours.has(node.id) : false;
      const isFocus = node.id === focus;
      const tone = node.layer === "core" ? GLOW : AURORA;
      // Foco não sofre o decay temporal — quando você está lendo/hovering, brilha.
      const alpha = (dimmed ? 0.18 : 1) * (isFocus ? 1 : ageFactor(node.updatedAt));

      const halo = ctx.createRadialGradient(node.x, node.y, r * 0.4, node.x, node.y, r * 3.1);
      halo.addColorStop(0, `rgba(${tone}, ${0.32 * alpha})`);
      halo.addColorStop(1, `rgba(${tone}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 3.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${tone}, ${(isFocus ? 0.95 : 0.6) * alpha})`;
      ctx.fill();
      ctx.lineWidth = isFocus ? 1.8 / scale : 1 / scale;
      ctx.strokeStyle = `rgba(233, 246, 255, ${(isFocus ? 0.9 : 0.35) * alpha})`;
      ctx.stroke();

      // Rótulo aparece se o usuário forçou, se estamos em zoom razoável ou se é o foco.
      if (showLabels || scale > 0.55 || isFocus) {
        const fontSize = Math.max(11 / scale, 3.8);
        ctx.font = `500 ${fontSize}px var(--font-plex-mono), monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = `rgba(233, 246, 255, ${(isFocus ? 0.95 : 0.78) * alpha})`;
        ctx.fillText(node.title, node.x, node.y + r + 5 / scale);
      }
    },
    [focus, neighbours, radius, showLabels, ageFactor]
  );

  const paintPointerArea = useCallback(
    (node: RenderNode, color: string, ctx: CanvasRenderingContext2D) => {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius(node) + 4, 0, Math.PI * 2);
      ctx.fill();
    },
    [radius]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkColor = useCallback(
    (link: any) => {
      if (!neighbours) return `rgba(${GLOW}, 0.22)`;
      const source = typeof link.source === "string" ? link.source : link.source.id;
      const target = typeof link.target === "string" ? link.target : link.target.id;
      const active = neighbours.has(source) && neighbours.has(target);
      return active ? `rgba(${GLOW}, 0.75)` : `rgba(${GLOW}, 0.07)`;
    },
    [neighbours]
  );

  return (
    <div ref={wrapper} className="relative h-full w-full">
      {size.width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graph}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={1}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintPointerArea}
          linkColor={linkColor}
          linkWidth={1}
          cooldownTicks={110}
          warmupTicks={50}
          minZoom={0.4}
          maxZoom={6}
          enableNodeDrag
          onNodeClick={(node: RenderNode) => onSelect(node.id)}
          onNodeHover={(node: RenderNode | null) => setHovered(node ? node.id : null)}
          onBackgroundClick={() => onSelect(null)}
          onEngineStop={() => graphRef.current?.zoomToFit(500, 100)}
        />
      )}

      <GraphControls onRecenter={recenter} />

      {/* Legenda no canto inferior esquerdo — cor por camada, tamanho por conexões. */}
      <div className="pointer-events-none absolute bottom-3 left-4 flex flex-col gap-1 font-mono text-[11px] text-mute/80">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-glow" />
            core
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-aurora" />
            growth
          </span>
          <span>· tamanho = conexões</span>
        </div>
        <span className="opacity-70">arraste para mover · clique num nó para ler</span>
      </div>
    </div>
  );
}
