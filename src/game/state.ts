import { COIN_FLIP_MS, DIVE_RESOLVE_MS, DUCKS_PER_SIDE, TOTAL_DUCKS } from "./constants";
import { allCoinsConsumed, assertCoinDistribution, createCoinPool, hiddenCoins } from "./coins";
import { BOARD_GRAPHS, distanceBetween, nextZone } from "./graph";
import { createRng } from "./rng";
import {
  hasAnyLegalMove,
  isZoneComplete,
  legalMovesForSide,
  sideAliveCount,
  validateMovePath,
} from "./movement";
import type { Coin, Duck, GameState, MoveValue, Side, ZoneId } from "./types";

function assertInitialDucks(ducks: Duck[], graphZone: ZoneId): void {
  if (ducks.length !== TOTAL_DUCKS) throw new Error("Duck Deep must start with exactly 10 ducks.");
  if (ducks.filter((duck) => duck.side === "human").length !== DUCKS_PER_SIDE) {
    throw new Error("Duck Deep must start with exactly 5 human ducks.");
  }
  if (ducks.filter((duck) => duck.side === "ai").length !== DUCKS_PER_SIDE) {
    throw new Error("Duck Deep must start with exactly 5 AI ducks.");
  }
  const graph = BOARD_GRAPHS[graphZone];
  const nodeIds = ducks.map((duck) => duck.nodeId);
  if (new Set(nodeIds).size !== nodeIds.length) throw new Error("Duplicate initial spawn nodes.");
  if (nodeIds.some((nodeId) => !nodeId || graph.nodes[nodeId]?.type !== "move")) {
    throw new Error("Initial ducks must spawn on normal movement nodes.");
  }
}

function farthestSpawnNodes(seed: number, count: number): { nodes: string[]; seed: number } {
  const graph = BOARD_GRAPHS.surface;
  const rng = createRng(seed);
  const candidates = rng.shuffle(
    Object.values(graph.nodes)
      .filter((node) => node.type === "move")
      .map((node) => node.id),
  );
  const chosen: string[] = [candidates.shift()!];
  while (chosen.length < count && candidates.length > 0) {
    candidates.sort((a, b) => {
      const scoreA = Math.min(...chosen.map((node) => distanceBetween(graph, a, node)));
      const scoreB = Math.min(...chosen.map((node) => distanceBetween(graph, b, node)));
      return scoreB - scoreA;
    });
    const pickWindow = candidates.slice(0, Math.min(4, candidates.length));
    const picked = pickWindow[rng.nextInt(pickWindow.length)];
    chosen.push(picked);
    candidates.splice(candidates.indexOf(picked), 1);
  }
  return { nodes: chosen, seed: rng.seed };
}

function makeDucks(spawnNodes: string[]): Duck[] {
  const ducks: Duck[] = [];
  for (let i = 0; i < DUCKS_PER_SIDE; i += 1) {
    ducks.push({ id: `H${i + 1}`, side: "human", nodeId: spawnNodes[i], status: "active" });
  }
  for (let i = 0; i < DUCKS_PER_SIDE; i += 1) {
    ducks.push({
      id: `A${i + 1}`,
      side: "ai",
      nodeId: spawnNodes[i + DUCKS_PER_SIDE],
      status: "active",
    });
  }
  return ducks;
}

export function createInitialState(seed = Date.now() >>> 0): GameState {
  const spawn = farthestSpawnNodes(seed, TOTAL_DUCKS);
  const ducks = makeDucks(spawn.nodes);
  assertInitialDucks(ducks, "surface");

  const rng = createRng(spawn.seed);
  const coins = createCoinPool(rng, 1);
  assertCoinDistribution(coins.map((coin) => coin.value));

  return {
    zone: "surface",
    phase: "choose-coin",
    turn: "human",
    ducks,
    coins,
    coinCycle: 1,
    currentCoinId: null,
    currentMoveValue: null,
    selectedDuckId: null,
    selectedPath: [],
    animation: null,
    pendingResolution: null,
    winner: null,
    randomSeed: rng.seed,
    turnCount: 1,
    message: "Choose a coin",
  };
}

function consumeCurrentCoin(state: GameState): GameState {
  let coins: Coin[] = state.coins;
  if (state.currentCoinId) {
    coins = coins.map((coin) =>
      coin.id === state.currentCoinId && coin.state === "revealed" ? { ...coin, state: "used" } : coin,
    );
  }

  let coinCycle = state.coinCycle;
  let randomSeed = state.randomSeed;
  if (allCoinsConsumed(coins)) {
    const rng = createRng(randomSeed);
    coinCycle += 1;
    coins = createCoinPool(rng, coinCycle);
    randomSeed = rng.seed;
  }

  return {
    ...state,
    coins,
    coinCycle,
    randomSeed,
    currentCoinId: null,
    currentMoveValue: null,
    selectedDuckId: null,
    selectedPath: [],
  };
}

function winnerFromDefeat(state: GameState): GameState | null {
  if (sideAliveCount(state, "human") === 0) {
    return {
      ...state,
      phase: "defeat",
      winner: "ai",
      message: "You have no ducks left.",
    };
  }
  if (sideAliveCount(state, "ai") === 0) {
    return {
      ...state,
      phase: "victory",
      winner: "human",
      message: "The AI has no ducks left.",
    };
  }
  return null;
}

function nextTurnState(state: GameState): GameState {
  const defeated = winnerFromDefeat(state);
  if (defeated) return defeated;
  if (isZoneComplete(state)) {
    return {
      ...state,
      phase: "moving",
      pendingResolution: "zone-transition",
      message: `${BOARD_GRAPHS[state.zone].label} complete.`,
    };
  }

  const turn: Side = state.turn === "human" ? "ai" : "human";
  return {
    ...state,
    turn,
    turnCount: state.turnCount + 1,
    phase: turn === "human" ? "choose-coin" : "ai-thinking",
    message: turn === "human" ? "Choose a coin" : "AI is thinking...",
  };
}

export function endTurn(state: GameState): GameState {
  return nextTurnState(consumeCurrentCoin(state));
}

export function startHumanCoinFlip(state: GameState, coinId: string): GameState {
  if (state.phase !== "choose-coin" || state.turn !== "human") return state;
  const coin = state.coins.find((candidate) => candidate.id === coinId);
  if (!coin || coin.state !== "hidden") return state;
  return {
    ...state,
    phase: "coin-flip",
    currentCoinId: coinId,
    coins: state.coins.map((candidate) =>
      candidate.id === coinId ? { ...candidate, state: "flipping" } : candidate,
    ),
    message: "Choose a coin",
  };
}

export function startAiCoinFlip(state: GameState): GameState {
  if (state.phase !== "ai-thinking" || state.turn !== "ai") return state;
  const available = hiddenCoins(state.coins);
  if (available.length === 0) return state;
  const rng = createRng(state.randomSeed);
  const coin = available[rng.nextInt(available.length)];
  return {
    ...state,
    randomSeed: rng.seed,
    phase: "coin-flip",
    currentCoinId: coin.id,
    coins: state.coins.map((candidate) =>
      candidate.id === coin.id ? { ...candidate, state: "flipping" } : candidate,
    ),
    message: "AI is thinking...",
  };
}

export function finishCoinFlip(state: GameState): GameState {
  if (state.phase !== "coin-flip" || !state.currentCoinId) return state;
  const coin = state.coins.find((candidate) => candidate.id === state.currentCoinId);
  if (!coin) return state;
  const value = coin.value;
  const revealedCoins = state.coins.map((candidate) =>
    candidate.id === state.currentCoinId ? { ...candidate, state: "revealed" as const } : candidate,
  );
  const next: GameState = {
    ...state,
    coins: revealedCoins,
    currentMoveValue: value,
  };

  if (!hasAnyLegalMove(next, state.turn, value)) {
    return {
      ...next,
      phase: "moving",
      pendingResolution: "end-turn",
      message: "No legal move.",
    };
  }

  return {
    ...next,
    phase: "choose-duck",
    message: state.turn === "human" ? `Move exactly ${value} spaces` : "AI is choosing a duck...",
  };
}

export function eligibleDuckIds(state: GameState): string[] {
  if (!state.currentMoveValue) return [];
  return [
    ...new Set(
      legalMovesForSide(state, state.turn, state.currentMoveValue).map((move) => move.duckId),
    ),
  ];
}

export function selectDuck(state: GameState, duckId: string): GameState {
  if (state.phase !== "choose-duck" || state.turn !== "human" || !state.currentMoveValue) return state;
  if (!eligibleDuckIds(state).includes(duckId)) return state;
  const duck = state.ducks.find((candidate) => candidate.id === duckId);
  if (!duck?.nodeId) return state;
  return {
    ...state,
    phase: "choose-path",
    selectedDuckId: duckId,
    selectedPath: [duck.nodeId],
    message: `Move exactly ${state.currentMoveValue} spaces`,
  };
}

export function beginDuckMove(state: GameState, duckId: string, path: string[]): GameState {
  if (!validateMovePath(state, duckId, path)) return state;
  return {
    ...state,
    phase: "moving",
    selectedDuckId: duckId,
    selectedPath: path,
    animation: {
      id: (state.animation?.id ?? 0) + state.turnCount + 1,
      duckId,
      path,
      step: 0,
    },
    pendingResolution: null,
    message: "Moving...",
  };
}

export function stepDuckAnimation(state: GameState, animationId: number, nodeId: string): GameState {
  if (!state.animation || state.animation.id !== animationId) return state;
  return {
    ...state,
    animation: { ...state.animation, step: state.animation.step + 1 },
    ducks: state.ducks.map((duck) =>
      duck.id === state.animation?.duckId ? { ...duck, nodeId } : duck,
    ),
  };
}

export function completeDuckAnimation(state: GameState, animationId: number): GameState {
  if (!state.animation || state.animation.id !== animationId) return state;
  const graph = BOARD_GRAPHS[state.zone];
  const { duckId, path } = state.animation;
  const destination = path[path.length - 1];
  const node = graph.nodes[destination];
  if (!node) return state;
  const movingDuck = state.ducks.find((duck) => duck.id === duckId);
  if (!movingDuck) return state;

  if (state.zone === "deep" && node.type === "hole") {
    const consumed = consumeCurrentCoin(state);
    return {
      ...consumed,
      zone: "pearl",
      phase: "victory",
      winner: movingDuck.side,
      animation: null,
      pendingResolution: null,
      ducks: consumed.ducks.map((duck) =>
        duck.id === duckId
          ? { ...duck, status: "winner", nodeId: destination }
          : duck.status === "active"
            ? { ...duck, status: "eliminated" }
            : duck,
      ),
      message:
        movingDuck.side === "human" ? "You found the Rare Pearl!" : "The AI found the Rare Pearl!",
    };
  }

  const secured = node.type === "hole";
  const ducks = state.ducks.map((duck) =>
    duck.id === duckId ? { ...duck, status: secured ? ("secured" as const) : duck.status } : duck,
  );
  const next: GameState = {
    ...state,
    ducks,
    animation: null,
    pendingResolution: secured && isZoneComplete({ ...state, ducks }) ? "zone-transition" : "end-turn",
    message: secured ? "Duck secured in a hole." : "Move complete.",
  };
  return next;
}

export function resolvePending(state: GameState): GameState {
  if (state.pendingResolution === "end-turn") return endTurn({ ...state, pendingResolution: null });
  if (state.pendingResolution === "zone-transition") return beginZoneTransition({
    ...state,
    pendingResolution: null,
  });
  return state;
}

export function beginZoneTransition(state: GameState): GameState {
  const graph = BOARD_GRAPHS[state.zone];
  const consumed = consumeCurrentCoin(state);
  return {
    ...consumed,
    phase: "zone-transition",
    message: `${graph.label} complete.`,
    ducks: consumed.ducks.map((duck) =>
      duck.status === "active" ? { ...duck, status: "eliminated" } : duck,
    ),
  };
}

function assignSurvivorsToNextZone(state: GameState, targetZone: ZoneId): Duck[] {
  const oldGraph = BOARD_GRAPHS[state.zone];
  const graph = BOARD_GRAPHS[targetZone];
  const used = new Set<string>();

  return state.ducks.map((duck) => {
    if (duck.status !== "secured" || !duck.nodeId) return duck;
    let nodeId: string | null = null;
    if (graph.nodes[duck.nodeId]?.type === "move" && !used.has(duck.nodeId)) {
      nodeId = duck.nodeId;
    } else {
      const source = oldGraph.nodes[duck.nodeId];
      const candidates = Object.values(graph.nodes)
        .filter((node) => node.type === "move" && !used.has(node.id))
        .sort((a, b) => {
          const da = source ? Math.hypot(a.x - source.x, a.y - source.y) : 0;
          const db = source ? Math.hypot(b.x - source.x, b.y - source.y) : 0;
          return da - db || a.id.localeCompare(b.id);
        });
      nodeId = candidates[0]?.id ?? null;
    }
    if (nodeId) used.add(nodeId);
    return { ...duck, nodeId, status: "active" };
  });
}

export function finishZoneTransition(state: GameState): GameState {
  if (state.phase !== "zone-transition") return state;
  const targetZone = nextZone(state.zone);
  if (!targetZone || targetZone === "pearl") return state;
  const ducks = assignSurvivorsToNextZone(state, targetZone);
  const moved: GameState = {
    ...state,
    zone: targetZone,
    ducks,
  };
  const defeated = winnerFromDefeat(moved);
  if (defeated) return defeated;

  const turn: Side = state.turn === "human" ? "ai" : "human";
  return {
    ...moved,
    phase: turn === "human" ? "choose-coin" : "ai-thinking",
    turn,
    turnCount: state.turnCount + 1,
    selectedDuckId: null,
    selectedPath: [],
    animation: null,
    message: turn === "human" ? "Choose a coin" : "AI is thinking...",
  };
}

export function appendPathNode(state: GameState, nodeId: string): GameState {
  if (state.phase !== "choose-path" || !state.selectedDuckId || !state.currentMoveValue) return state;
  const selectedPath = [...state.selectedPath, nodeId];
  if (selectedPath.length === state.currentMoveValue + 1) {
    return beginDuckMove(state, state.selectedDuckId, selectedPath);
  }
  return {
    ...state,
    selectedPath,
    message: `Move exactly ${state.currentMoveValue} spaces`,
  };
}

export function completeAiChoice(state: GameState, path: string[] | null, duckId: string | null): GameState {
  if (!path || !duckId) {
    return {
      ...state,
      phase: "moving",
      pendingResolution: "end-turn",
      message: "No legal move.",
    };
  }
  return beginDuckMove(state, duckId, path);
}

export function animationDelayForState(state: GameState, reducedMotion: boolean): number {
  if (state.pendingResolution === "zone-transition") return reducedMotion ? 250 : DIVE_RESOLVE_MS;
  if (state.pendingResolution === "end-turn") return reducedMotion ? 150 : 300;
  if (state.phase === "coin-flip") return reducedMotion ? 120 : COIN_FLIP_MS;
  return reducedMotion ? 120 : 300;
}
