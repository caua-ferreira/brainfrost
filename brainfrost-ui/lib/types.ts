export type Layer = "core" | "growth";

export interface Note {
  id?: string;
  slug: string;
  file: string;
  title: string;
  tags: string[];
  concepts: string[];
  layer: Layer;
  category?: string;
  content: string;
  raw: string;
  excerpt: string;
  links: string[];
  backlinks: string[];
  broken: string[];
  updatedAt: string;
  words: number;
}

export interface GraphNode {
  id: string;
  title: string;
  layer: Layer;
  kind?: "note" | "group";
  count?: number;
  degree: number;
  words: number;
  updatedAt: string;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface VaultStats {
  notes: number;
  edges: number;
  words: number;
  orphans: number;
  broken: string[];
  lastUpdate: string;
}

export interface VaultSnapshot {
  dir: string;
  notes: Note[];
  graph: GraphData;
  stats: VaultStats;
}
