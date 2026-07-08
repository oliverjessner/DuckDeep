import type { BoardGraph, GameState } from "../game/types";

function remaining(state: GameState, side: "human" | "ai") {
  return state.ducks.filter(
    (duck) =>
      duck.side === side &&
      (duck.status === "active" || duck.status === "secured" || duck.status === "winner"),
  ).length;
}

export function GameStatus({ state, graph }: { state: GameState; graph: BoardGraph }) {
  const hiddenCoins = state.coins.filter((coin) => coin.state === "hidden").length;
  const turnLabel =
    state.phase === "victory" || state.phase === "defeat"
      ? "Game over"
      : state.turn === "human"
        ? "Your turn"
        : state.phase === "ai-thinking"
          ? "AI is thinking..."
          : "AI turn";
  return (
    <section className="status-strip" aria-label="Game status">
      <div>
        <span className="status-label">Zone</span>
        <strong>{graph.label}</strong>
      </div>
      <div>
        <span className="status-label">Turn</span>
        <strong>{turnLabel}</strong>
      </div>
      <div>
        <span className="status-label">Human ducks</span>
        <strong>{remaining(state, "human")}</strong>
      </div>
      <div>
        <span className="status-label">AI ducks</span>
        <strong>{remaining(state, "ai")}</strong>
      </div>
      <div>
        <span className="status-label">Coins</span>
        <strong>{hiddenCoins}/10 hidden</strong>
      </div>
    </section>
  );
}
