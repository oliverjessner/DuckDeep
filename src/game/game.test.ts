import { describe, expect, it } from "vitest";
import { COIN_DISTRIBUTION } from "./constants";
import { allCoinsConsumed, createCoinPoolFromSeed } from "./coins";
import { BOARD_GRAPHS } from "./graph";
import {
  freeHoleIds,
  getLegalPathsForDuck,
  hasAnyLegalMove,
  isZoneComplete,
  occupiedNodeIds,
  validateMovePath,
} from "./movement";
import {
  beginZoneTransition,
  createInitialState,
  endTurn,
  finishCoinFlip,
  finishZoneTransition,
  startHumanCoinFlip,
} from "./state";
import type { Duck, GameState, ZoneId } from "./types";

function valueCounts(values: number[]) {
  return values.reduce(
    (acc, value) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }),
    {} as Record<number, number>,
  );
}

function stateWithDuckAt(nodeId: string, occupied: string[] = []): GameState {
  const state = createInitialState(123);
  return {
    ...state,
    currentMoveValue: 1,
    ducks: state.ducks.map((duck, index) => {
      if (index === 0) return { ...duck, nodeId, status: "active" };
      if (occupied[index - 1]) return { ...duck, nodeId: occupied[index - 1], status: "active" };
      return { ...duck, status: "eliminated", nodeId: null };
    }),
  };
}

function completeZone(state: GameState, zone: ZoneId): GameState {
  const graph = BOARD_GRAPHS[zone];
  let alive = state.ducks.filter((duck) => duck.status !== "eliminated");
  const securedIds = new Set(alive.slice(0, graph.holes.length).map((duck) => duck.id));
  const holeByDuck = new Map(alive.slice(0, graph.holes.length).map((duck, index) => [duck.id, graph.holes[index]]));
  return {
    ...state,
    zone,
    ducks: state.ducks.map((duck) => {
      if (securedIds.has(duck.id)) {
        return { ...duck, status: "secured", nodeId: holeByDuck.get(duck.id)! };
      }
      return duck.status === "eliminated" ? duck : { ...duck, status: "active", nodeId: "n0_0" };
    }),
  };
}

describe("coins", () => {
  it("creates the required 3x1, 3x2, 3x3, 1x4 pool", () => {
    const { coins } = createCoinPoolFromSeed(10);
    expect(valueCounts(coins.map((coin) => coin.value))).toEqual({ 1: 3, 2: 3, 3: 3, 4: 1 });
    expect(valueCounts(COIN_DISTRIBUTION)).toEqual({ 1: 3, 2: 3, 3: 3, 4: 1 });
  });

  it("reshuffles only after all ten coins are consumed", () => {
    let state = createInitialState(12);
    const firstCycle = state.coinCycle;
    for (let i = 0; i < 9; i += 1) {
      const coin = state.coins.find((candidate) => candidate.state === "hidden")!;
      state = { ...state, phase: "choose-coin", turn: "human" };
      state = startHumanCoinFlip(state, coin.id);
      state = finishCoinFlip(state);
      state = endTurn(state);
      expect(state.coinCycle).toBe(firstCycle);
    }
    const coin = state.coins.find((candidate) => candidate.state === "hidden")!;
    state = { ...state, phase: "choose-coin", turn: "human" };
    state = startHumanCoinFlip(state, coin.id);
    state = finishCoinFlip(state);
    state = endTurn(state);
    expect(state.coinCycle).toBe(firstCycle + 1);
    expect(allCoinsConsumed(state.coins)).toBe(false);
  });
});

describe("movement", () => {
  it("finds exact-N graph paths and rejects disconnected paths", () => {
    const state = { ...stateWithDuckAt("n0_0"), currentMoveValue: 2 as const };
    const paths = getLegalPathsForDuck(state, "H1", 2);
    expect(paths.every((path) => path.length === 3)).toBe(true);
    expect(paths.some((path) => path.join(">") === "n0_0>n1_0>n1_1")).toBe(true);
    expect(validateMovePath(state, "H1", ["n0_0", "n5_6", "n0_0"])).toBe(false);
  });

  it("blocks occupied normal destinations and occupied holes", () => {
    const normalBlocked = stateWithDuckAt("n0_0", ["n1_0"]);
    expect(getLegalPathsForDuck(normalBlocked, "H1", 1).some((path) => path[path.length - 1] === "n1_0")).toBe(false);

    const holeBlocked = stateWithDuckAt("n0_0", ["n0_1"]);
    expect(getLegalPathsForDuck(holeBlocked, "H1", 1).some((path) => path[path.length - 1] === "n0_1")).toBe(false);
    expect(occupiedNodeIds(holeBlocked).has("n0_1")).toBe(true);
  });

  it("detects no-legal-move turns without freezing", () => {
    let state = createInitialState(55);
    state = {
      ...state,
      currentMoveValue: 1,
      ducks: state.ducks.map((duck) =>
        duck.side === "human" ? { ...duck, status: "secured", nodeId: "n0_1" } : duck,
      ),
    };
    expect(hasAnyLegalMove(state, "human", 1)).toBe(false);

    state = createInitialState(55);
    const coin = state.coins.find((candidate) => candidate.state === "hidden")!;
    state = {
      ...startHumanCoinFlip(state, coin.id),
      ducks: state.ducks.map((duck) =>
        duck.side === "human" ? { ...duck, status: "secured", nodeId: "n0_1" } : duck,
      ),
    };
    state = finishCoinFlip(state);
    expect(state.message).toBe("No legal move.");
    expect(state.pendingResolution).toBe("end-turn");
  });
});

describe("zones and endings", () => {
  it("validates expected SVG hole counts", () => {
    expect(BOARD_GRAPHS.surface.holes).toHaveLength(8);
    expect(BOARD_GRAPHS.reeds.holes).toHaveLength(5);
    expect(BOARD_GRAPHS.shallow.holes).toHaveLength(3);
    expect(BOARD_GRAPHS.deep.holes).toHaveLength(1);
    expect(BOARD_GRAPHS.pearl.goal).toBe("n3_6");
  });

  it("completes a zone only after every hole is occupied", () => {
    const state = createInitialState(77);
    expect(isZoneComplete(state)).toBe(false);
    const graph = BOARD_GRAPHS.surface;
    const ducks = state.ducks.map((duck, index) =>
      index < graph.holes.length ? { ...duck, status: "secured" as const, nodeId: graph.holes[index] } : duck,
    );
    expect(isZoneComplete({ ...state, ducks })).toBe(true);
    expect(freeHoleIds({ ...state, ducks })).toHaveLength(0);
  });

  it("eliminates non-hole ducks and reduces survivors 10 to 8 to 5 to 3", () => {
    let state = createInitialState(91);
    state = finishZoneTransition(beginZoneTransition(completeZone(state, "surface")));
    expect(state.ducks.filter((duck) => duck.status !== "eliminated")).toHaveLength(8);
    expect(state.zone).toBe("reeds");

    state = finishZoneTransition(beginZoneTransition(completeZone(state, "reeds")));
    expect(state.ducks.filter((duck) => duck.status !== "eliminated")).toHaveLength(5);
    expect(state.zone).toBe("shallow");

    state = finishZoneTransition(beginZoneTransition(completeZone(state, "shallow")));
    expect(state.ducks.filter((duck) => duck.status !== "eliminated")).toHaveLength(3);
    expect(state.zone).toBe("deep");
  });

  it("declares defeat when a side has no ducks remaining after transition", () => {
    let state = createInitialState(101);
    const graph = BOARD_GRAPHS.surface;
    const aiDucks = state.ducks.filter((duck) => duck.side === "ai");
    const ducks: Duck[] = state.ducks.map((duck) => {
      const aiIndex = aiDucks.findIndex((candidate) => candidate.id === duck.id);
      if (aiIndex >= 0) return { ...duck, status: "secured", nodeId: graph.holes[aiIndex] };
      return { ...duck, status: "active", nodeId: "n0_0" };
    });
    state = finishZoneTransition(beginZoneTransition({ ...state, ducks }));
    expect(state.phase).toBe("defeat");
    expect(state.winner).toBe("ai");
  });

  it("restart produces a clean surface state", () => {
    const state = createInitialState(404);
    expect(state.zone).toBe("surface");
    expect(state.phase).toBe("choose-coin");
    expect(state.ducks).toHaveLength(10);
    expect(new Set(state.ducks.map((duck) => duck.nodeId)).size).toBe(10);
    expect(state.coins.every((coin) => coin.state === "hidden")).toBe(true);
  });
});
