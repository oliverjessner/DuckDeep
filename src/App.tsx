import { Board } from "./components/Board";
import { CoinTray } from "./components/CoinTray";
import { EndGameModal } from "./components/EndGameModal";
import { GameStatus } from "./components/GameStatus";
import { useGameController } from "./hooks/useGameController";

export default function App() {
  const {
    state,
    graph,
    eligibleDucks,
    legalNextNodes,
    onCoinClick,
    onDuckClick,
    onNodeClick,
    restart,
  } = useGameController();

  const coinDisabled = state.turn !== "human" || state.phase !== "choose-coin";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Duck Deep</h1>
          <p>Quack your way down.</p>
        </div>
        <button type="button" className="restart-button" onClick={restart}>
          Restart
        </button>
      </header>

      <GameStatus state={state} graph={graph} />

      <div className="message-line" role="status" aria-live="polite">
        {state.message}
      </div>

      <div className="play-layout">
        <aside className="side-panel">
          <CoinTray coins={state.coins} disabled={coinDisabled} onCoinClick={onCoinClick} />
        </aside>

        <Board
          state={state}
          graph={graph}
          eligibleDucks={eligibleDucks}
          legalNextNodes={legalNextNodes}
          onDuckClick={onDuckClick}
          onNodeClick={onNodeClick}
        />
      </div>

      <EndGameModal state={state} onRestart={restart} />
    </main>
  );
}
