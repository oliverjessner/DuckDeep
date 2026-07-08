import surfaceRaw from "../../assets/maps/0_wasseroberflaeche.svg?raw";
import reedsRaw from "../../assets/maps/1_schilf-zone.svg?raw";
import shallowRaw from "../../assets/maps/2_flachwasser.svg?raw";
import deepRaw from "../../assets/maps/3_tiefsee.svg?raw";
import pearlRaw from "../../assets/maps/4_seltene-perle.svg?raw";
import surfaceUrl from "../../assets/maps/0_wasseroberflaeche.svg";
import reedsUrl from "../../assets/maps/1_schilf-zone.svg";
import shallowUrl from "../../assets/maps/2_flachwasser.svg";
import deepUrl from "../../assets/maps/3_tiefsee.svg";
import pearlUrl from "../../assets/maps/4_seltene-perle.svg";
import type { BoardEdge, BoardGraph, BoardNode, NodeType, ZoneId } from "./types";

type ZoneConfig = {
  id: ZoneId;
  label: string;
  raw: string;
  assetUrl: string;
  expectedHoleCount: number;
};

const CONFIGS: ZoneConfig[] = [
  {
    id: "surface",
    label: "Water Surface",
    raw: surfaceRaw,
    assetUrl: surfaceUrl,
    expectedHoleCount: 8,
  },
  {
    id: "reeds",
    label: "Reed Zone",
    raw: reedsRaw,
    assetUrl: reedsUrl,
    expectedHoleCount: 5,
  },
  {
    id: "shallow",
    label: "Shallow Water",
    raw: shallowRaw,
    assetUrl: shallowUrl,
    expectedHoleCount: 3,
  },
  {
    id: "deep",
    label: "Deep Sea",
    raw: deepRaw,
    assetUrl: deepUrl,
    expectedHoleCount: 1,
  },
  {
    id: "pearl",
    label: "Rare Pearl",
    raw: pearlRaw,
    assetUrl: pearlUrl,
    expectedHoleCount: 0,
  },
];

function parseTranslate(value: string | null): { x: number; y: number } | null {
  const match = value?.match(/translate\(\s*([-0-9.]+)[,\s]+([-0-9.]+)\s*\)/);
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]) };
}

function parseNode(group: Element): BoardNode {
  const id = group.getAttribute("data-node-id");
  if (!id) throw new Error("SVG node missing data-node-id");

  const isHole = group.getAttribute("data-hole") === "true";
  const isGoal = group.getAttribute("data-goal") === "true";
  const type: NodeType = isHole ? "hole" : isGoal ? "goal" : "move";

  let x: number | null = null;
  let y: number | null = null;

  if (isGoal) {
    const translated = parseTranslate(group.querySelector("g[transform]")?.getAttribute("transform") ?? null);
    if (translated) {
      x = translated.x;
      y = translated.y;
    }
  }

  if (x === null || y === null) {
    const shape = group.querySelector("circle[cx][cy], ellipse[cx][cy]");
    if (shape) {
      x = Number(shape.getAttribute("cx"));
      y = Number(shape.getAttribute("cy"));
    }
  }

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Could not determine coordinates for SVG node ${id}`);
  }

  return { id, x: x!, y: y!, type };
}

export function parseBoardGraph(config: ZoneConfig): BoardGraph {
  const doc = new DOMParser().parseFromString(config.raw, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) throw new Error(`Missing root SVG for ${config.id}`);

  const [x, y, width, height] = (svg.getAttribute("viewBox") ?? "")
    .split(/\s+/)
    .map(Number);
  if (![x, y, width, height].every(Number.isFinite)) {
    throw new Error(`Invalid viewBox for ${config.id}`);
  }

  const nodes: Record<string, BoardNode> = {};
  const holes: string[] = [];
  let goal: string | null = null;

  doc.querySelectorAll("[data-node-id]").forEach((group) => {
    const node = parseNode(group);
    nodes[node.id] = node;
    if (node.type === "hole") holes.push(node.id);
    if (node.type === "goal") goal = node.id;
  });

  const edges: BoardEdge[] = [...doc.querySelectorAll("[data-from][data-to]")].map((edge) => ({
    from: edge.getAttribute("data-from")!,
    to: edge.getAttribute("data-to")!,
  }));

  const adjacency: Record<string, string[]> = {};
  Object.keys(nodes).forEach((id) => {
    adjacency[id] = [];
  });
  edges.forEach(({ from, to }) => {
    if (!nodes[from] || !nodes[to]) {
      throw new Error(`Edge ${from} -> ${to} references a missing node in ${config.id}`);
    }
    adjacency[from].push(to);
    adjacency[to].push(from);
  });

  const graph: BoardGraph = {
    zoneId: config.id,
    label: config.label,
    assetUrl: config.assetUrl,
    expectedHoleCount: config.expectedHoleCount,
    viewBox: { x, y, width, height },
    nodes,
    edges,
    adjacency,
    holes,
    goal,
  };

  if (graph.holes.length !== config.expectedHoleCount) {
    throw new Error(
      `${config.label} expected ${config.expectedHoleCount} holes, found ${graph.holes.length}`,
    );
  }
  return graph;
}

export const BOARD_GRAPHS: Record<ZoneId, BoardGraph> = CONFIGS.reduce(
  (acc, config) => {
    acc[config.id] = parseBoardGraph(config);
    return acc;
  },
  {} as Record<ZoneId, BoardGraph>,
);

export const ZONE_ORDER: ZoneId[] = ["surface", "reeds", "shallow", "deep", "pearl"];

export function nextZone(zone: ZoneId): ZoneId | null {
  const index = ZONE_ORDER.indexOf(zone);
  return index >= 0 && index < ZONE_ORDER.length - 1 ? ZONE_ORDER[index + 1] : null;
}

export function distanceBetween(graph: BoardGraph, a: string, b: string): number {
  const nodeA = graph.nodes[a];
  const nodeB = graph.nodes[b];
  if (!nodeA || !nodeB) return Number.POSITIVE_INFINITY;
  return Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);
}

export function shortestDistanceToAny(graph: BoardGraph, start: string, targets: Set<string>): number {
  if (targets.has(start)) return 0;
  const queue: Array<{ id: string; distance: number }> = [{ id: start, distance: 0 }];
  const seen = new Set([start]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of graph.adjacency[current.id] ?? []) {
      if (seen.has(next)) continue;
      if (targets.has(next)) return current.distance + 1;
      seen.add(next);
      queue.push({ id: next, distance: current.distance + 1 });
    }
  }
  return Number.POSITIVE_INFINITY;
}
