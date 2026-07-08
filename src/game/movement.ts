import { BLOCK_OCCUPIED_DESTINATIONS, BLOCK_PASS_THROUGH_OCCUPIED } from "./constants";
import { BOARD_GRAPHS } from "./graph";
import type { BoardGraph, GameState, LegalMove, MoveValue, Side } from "./types";

export function occupiedNodeIds(state: GameState, exceptDuckId?: string): Set<string> {
  return new Set(
    state.ducks
      .filter((duck) => duck.id !== exceptDuckId)
      .filter((duck) => duck.status === "active" || duck.status === "secured" || duck.status === "winner")
      .map((duck) => duck.nodeId)
      .filter((nodeId): nodeId is string => Boolean(nodeId)),
  );
}

export function freeHoleIds(state: GameState): Set<string> {
  const graph = BOARD_GRAPHS[state.zone];
  const occupied = occupiedNodeIds(state);
  return new Set(graph.holes.filter((hole) => !occupied.has(hole)));
}

export function isZoneComplete(state: GameState): boolean {
  const graph = BOARD_GRAPHS[state.zone];
  if (graph.holes.length === 0) return false;
  const occupied = occupiedNodeIds(state);
  return graph.holes.every((hole) => occupied.has(hole));
}

export function sideAliveCount(state: GameState, side: Side): number {
  return state.ducks.filter(
    (duck) =>
      duck.side === side &&
      (duck.status === "active" || duck.status === "secured" || duck.status === "winner"),
  ).length;
}

export function sideActiveCount(state: GameState, side: Side): number {
  return state.ducks.filter((duck) => duck.side === side && duck.status === "active").length;
}

function canEnterNode(
  graph: BoardGraph,
  state: GameState,
  nodeId: string,
  isFinalStep: boolean,
  movingDuckId: string,
): boolean {
  const node = graph.nodes[nodeId];
  if (!node) return false;
  const occupied = occupiedNodeIds(state, movingDuckId);
  if (occupied.has(nodeId)) return false;
  if (node.type === "hole" && !isFinalStep) return false;
  if (node.type === "goal") return false;
  if (BLOCK_PASS_THROUGH_OCCUPIED && occupied.has(nodeId)) return false;
  if (BLOCK_OCCUPIED_DESTINATIONS && isFinalStep && occupied.has(nodeId)) return false;
  return true;
}

export function getLegalPathsForDuck(
  state: GameState,
  duckId: string,
  steps: MoveValue,
): string[][] {
  const graph = BOARD_GRAPHS[state.zone];
  const duck = state.ducks.find((candidate) => candidate.id === duckId);
  if (!duck || duck.status !== "active" || !duck.nodeId) return [];

  const paths: string[][] = [];

  function walk(path: string[]): void {
    if (path.length === steps + 1) {
      paths.push(path);
      return;
    }
    const current = path[path.length - 1];
    const nextStepIndex = path.length;
    const isFinalStep = nextStepIndex === steps;
    for (const next of graph.adjacency[current] ?? []) {
      if (!canEnterNode(graph, state, next, isFinalStep, duckId)) continue;
      walk([...path, next]);
    }
  }

  walk([duck.nodeId]);
  return paths;
}

export function validateMovePath(state: GameState, duckId: string, path: string[]): boolean {
  const value = state.currentMoveValue;
  if (!value || path.length !== value + 1) return false;
  const graph = BOARD_GRAPHS[state.zone];
  const duck = state.ducks.find((candidate) => candidate.id === duckId);
  if (!duck || duck.status !== "active" || duck.nodeId !== path[0]) return false;
  for (let i = 1; i < path.length; i += 1) {
    const from = path[i - 1];
    const to = path[i];
    if (!graph.adjacency[from]?.includes(to)) return false;
    if (!canEnterNode(graph, state, to, i === path.length - 1, duckId)) return false;
  }
  return true;
}

export function legalMovesForSide(state: GameState, side: Side, value: MoveValue): LegalMove[] {
  const graph = BOARD_GRAPHS[state.zone];
  return state.ducks
    .filter((duck) => duck.side === side && duck.status === "active")
    .flatMap((duck) =>
      getLegalPathsForDuck(state, duck.id, value).map((path) => {
        const destination = path[path.length - 1];
        return {
          duckId: duck.id,
          path,
          destination,
          landsOnHole: graph.nodes[destination]?.type === "hole",
        };
      }),
    );
}

export function hasAnyLegalMove(state: GameState, side: Side, value: MoveValue): boolean {
  return legalMovesForSide(state, side, value).length > 0;
}

export function nextNodesForPathPrefix(state: GameState, duckId: string, prefix: string[]): string[] {
  const value = state.currentMoveValue;
  if (!value) return [];
  const prefixKey = prefix.join("|");
  const nodes = new Set<string>();
  for (const path of getLegalPathsForDuck(state, duckId, value)) {
    if (path.length <= prefix.length) continue;
    if (path.slice(0, prefix.length).join("|") === prefixKey) {
      nodes.add(path[prefix.length]);
    }
  }
  return [...nodes];
}
