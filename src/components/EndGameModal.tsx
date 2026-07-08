import type { GameState } from "../game/types";

export function EndGameModal({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  if (state.phase !== "victory" && state.phase !== "defeat") return null;
  const finalPearl = state.zone === "pearl";
  const title =
    finalPearl && state.winner === "human"
      ? "You found the Rare Pearl!"
      : finalPearl && state.winner === "ai"
        ? "The AI found the Rare Pearl!"
        : state.winner === "human"
          ? "You win"
          : "You lose";
  const body = finalPearl ? "Play again" : state.message;
  return (
    <div className="endgame-backdrop" role="dialog" aria-modal="true" aria-labelledby="endgame-title">
      <div className="endgame-panel">
        <h2 id="endgame-title">{title}</h2>
        <p>{body}</p>
        <button type="button" className="primary-button" onClick={onRestart}>
          Restart
        </button>
      </div>
    </div>
  );
}
