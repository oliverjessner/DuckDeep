import type { BoardGraph, GameState } from "../game/types";
import { DuckPiece } from "./DuckPiece";

type BoardProps = {
  state: GameState;
  graph: BoardGraph;
  eligibleDucks: Set<string>;
  legalNextNodes: Set<string>;
  onDuckClick: (duckId: string) => void;
  onNodeClick: (nodeId: string) => void;
};

export function Board({ state, graph, eligibleDucks, legalNextNodes, onDuckClick, onNodeClick }: BoardProps) {
  return (
    <section className={`board-shell phase-${state.phase}`} aria-label="Duck Deep board">
      <div className="board-stage">
        <img className="board-map" src={graph.assetUrl} alt={`${graph.label} map`} draggable={false} />

        {state.phase === "zone-transition" && <div className="depth-wash" aria-hidden="true" />}

        {[...legalNextNodes].map((nodeId) => {
          const node = graph.nodes[nodeId];
          if (!node) return null;
          return (
            <button
              key={nodeId}
              type="button"
              className={`move-highlight ${node.type === "hole" ? "is-hole" : ""}`}
              style={{ left: `${(node.x / graph.viewBox.width) * 100}%`, top: `${(node.y / graph.viewBox.height) * 100}%` }}
              onClick={() => onNodeClick(nodeId)}
              aria-label={`Move to ${node.type} node ${nodeId}`}
            />
          );
        })}

        {graph.holes.map((holeId) => {
          const node = graph.nodes[holeId];
          const occupied = state.ducks.some((duck) => duck.nodeId === holeId && duck.status === "secured");
          return (
            <span
              key={holeId}
              className={`hole-marker ${occupied ? "is-occupied" : ""}`}
              style={{ left: `${(node.x / graph.viewBox.width) * 100}%`, top: `${(node.y / graph.viewBox.height) * 100}%` }}
              aria-hidden="true"
            />
          );
        })}

        {state.ducks.map((duck) => (
          <DuckPiece
            key={duck.id}
            duck={duck}
            graph={graph}
            eligible={state.turn === "human" && state.phase === "choose-duck" && eligibleDucks.has(duck.id)}
            selected={state.selectedDuckId === duck.id}
            moving={state.animation?.duckId === duck.id}
            onDuckClick={onDuckClick}
          />
        ))}
      </div>
    </section>
  );
}
