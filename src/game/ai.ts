import { createRng } from "./rng";
import { BOARD_GRAPHS, shortestDistanceToAny } from "./graph";
import { freeHoleIds, legalMovesForSide, occupiedNodeIds } from "./movement";
import type { GameState, LegalMove } from "./types";

function mobilityAfterMove(state: GameState, move: LegalMove): number {
  const graph = BOARD_GRAPHS[state.zone];
  const destination = move.destination;
  const occupied = occupiedNodeIds(state, move.duckId);
  return (graph.adjacency[destination] ?? []).filter((nodeId) => !occupied.has(nodeId)).length;
}

function opponentDenial(state: GameState, move: LegalMove): number {
  const graph = BOARD_GRAPHS[state.zone];
  const humanNodes = state.ducks
    .filter((duck) => duck.side === "human" && duck.status === "active" && duck.nodeId)
    .map((duck) => duck.nodeId!);
  if (humanNodes.length === 0) return 0;
  const nearHuman = humanNodes.some((nodeId) => graph.adjacency[move.destination]?.includes(nodeId));
  return nearHuman ? 4 : 0;
}

export function chooseAiMove(state: GameState): { move: LegalMove | null; seed: number } {
  if (!state.currentMoveValue) return { move: null, seed: state.randomSeed };
  const graph = BOARD_GRAPHS[state.zone];
  const rng = createRng(state.randomSeed);
  const freeHoles = freeHoleIds(state);
  const moves = legalMovesForSide(state, "ai", state.currentMoveValue);
  if (moves.length === 0) return { move: null, seed: rng.seed };

  const scored = moves.map((move) => {
    const distance = move.landsOnHole
      ? 0
      : shortestDistanceToAny(graph, move.destination, freeHoles);
    const finiteDistance = Number.isFinite(distance) ? distance : 20;
    const mobility = mobilityAfterMove(state, move);
    const futureHoleOptions = (graph.adjacency[move.destination] ?? []).filter((nodeId) =>
      freeHoles.has(nodeId),
    ).length;
    const score =
      (move.landsOnHole ? 1000 : 0) -
      finiteDistance * 16 +
      mobility * 5 +
      futureHoleOptions * 8 +
      opponentDenial(state, move) +
      rng.nextFloat() * 5;
    return { ...move, score };
  });

  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return { move: scored[0], seed: rng.seed };
}
