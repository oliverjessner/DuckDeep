import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EDGE_MOVE_MS, ZONE_TRANSITION_MS } from "../game/constants";
import { chooseAiMove } from "../game/ai";
import { BOARD_GRAPHS } from "../game/graph";
import {
  animationDelayForState,
  appendPathNode,
  completeAiChoice,
  completeDuckAnimation,
  createInitialState,
  eligibleDuckIds,
  finishCoinFlip,
  finishZoneTransition,
  resolvePending,
  selectDuck,
  startAiCoinFlip,
  startHumanCoinFlip,
  stepDuckAnimation,
} from "../game/state";
import { nextNodesForPathPrefix } from "../game/movement";
import type { GameState } from "../game/types";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

function clearTimers(timers: React.MutableRefObject<number[]>): void {
  timers.current.forEach((timer) => window.clearTimeout(timer));
  timers.current = [];
}

function schedule(timers: React.MutableRefObject<number[]>, callback: () => void, delay: number): void {
  const timer = window.setTimeout(callback, delay);
  timers.current.push(timer);
}

export function useGameController() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const timers = useRef<number[]>([]);
  const animationStarted = useRef<number | null>(null);
  const phaseKey = useRef<string>("");
  const reducedMotion = usePrefersReducedMotion();

  const restart = useCallback(() => {
    clearTimers(timers);
    animationStarted.current = null;
    phaseKey.current = "";
    setState(createInitialState(Date.now() >>> 0));
  }, []);

  const onCoinClick = useCallback((coinId: string) => {
    setState((current) => startHumanCoinFlip(current, coinId));
  }, []);

  const onDuckClick = useCallback((duckId: string) => {
    setState((current) => selectDuck(current, duckId));
  }, []);

  const onNodeClick = useCallback((nodeId: string) => {
    setState((current) => appendPathNode(current, nodeId));
  }, []);

  useEffect(() => {
    const key = `${state.phase}-${state.turn}-${state.currentCoinId}-${state.turnCount}-${state.pendingResolution}`;
    if (phaseKey.current === key) return;
    phaseKey.current = key;

    if (state.phase === "ai-thinking") {
      schedule(timers, () => setState((current) => startAiCoinFlip(current)), reducedMotion ? 120 : 650);
    }

    if (state.phase === "coin-flip") {
      schedule(timers, () => setState((current) => finishCoinFlip(current)), animationDelayForState(state, reducedMotion));
    }

    if (state.turn === "ai" && state.phase === "choose-duck") {
      schedule(
        timers,
        () =>
          setState((current) => {
            const choice = chooseAiMove(current);
            return completeAiChoice(current, choice.move?.path ?? null, choice.move?.duckId ?? null);
          }),
        reducedMotion ? 120 : 420,
      );
    }

    if (state.phase === "moving" && !state.animation && state.pendingResolution) {
      schedule(
        timers,
        () => setState((current) => resolvePending(current)),
        animationDelayForState(state, reducedMotion),
      );
    }

    if (state.phase === "zone-transition") {
      schedule(
        timers,
        () => setState((current) => finishZoneTransition(current)),
        reducedMotion ? 250 : ZONE_TRANSITION_MS,
      );
    }
  }, [state, reducedMotion]);

  useEffect(() => {
    const animation = state.animation;
    if (!animation || animationStarted.current === animation.id) return;
    animationStarted.current = animation.id;
    const edgeDelay = reducedMotion ? 70 : EDGE_MOVE_MS;
    animation.path.slice(1).forEach((nodeId, index) => {
      schedule(timers, () => setState((current) => stepDuckAnimation(current, animation.id, nodeId)), edgeDelay * (index + 1));
    });
    schedule(
      timers,
      () => setState((current) => completeDuckAnimation(current, animation.id)),
      edgeDelay * animation.path.slice(1).length + (reducedMotion ? 80 : 180),
    );
  }, [state.animation, reducedMotion]);

  const eligibleDucks = useMemo(() => new Set(eligibleDuckIds(state)), [state]);
  const legalNextNodes = useMemo(() => {
    if (!state.selectedDuckId) return new Set<string>();
    return new Set(nextNodesForPathPrefix(state, state.selectedDuckId, state.selectedPath));
  }, [state]);

  useEffect(() => {
    const graph = BOARD_GRAPHS[state.zone];
    window.render_game_to_text = () =>
      JSON.stringify({
        coordinateSystem: "SVG viewBox coordinates, origin top-left, x right, y down.",
        zone: graph.label,
        phase: state.phase,
        turn: state.turn,
        message: state.message,
        currentMoveValue: state.currentMoveValue,
        selectedDuckId: state.selectedDuckId,
        selectedPath: state.selectedPath,
        legalNextNodes: [...legalNextNodes],
        ducks: state.ducks.map((duck) => ({
          id: duck.id,
          side: duck.side,
          status: duck.status,
          nodeId: duck.nodeId,
          position: duck.nodeId ? graph.nodes[duck.nodeId] ?? null : null,
        })),
        coins: state.coins.map((coin) => ({
          id: coin.id,
          state: coin.state,
          value: coin.state === "hidden" || coin.state === "flipping" ? null : coin.value,
        })),
        winner: state.winner,
      });
    window.advanceTime = () => undefined;
  }, [state, legalNextNodes]);

  useEffect(() => () => clearTimers(timers), []);

  return {
    state,
    graph: BOARD_GRAPHS[state.zone],
    eligibleDucks,
    legalNextNodes,
    onCoinClick,
    onDuckClick,
    onNodeClick,
    restart,
    reducedMotion,
  };
}
