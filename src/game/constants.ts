import type { MoveValue } from "./types";

export const DUCKS_PER_SIDE = 5;
export const TOTAL_DUCKS = DUCKS_PER_SIDE * 2;
export const COIN_DISTRIBUTION: MoveValue[] = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4];

export const BOARD_WIDTH = 1200;
export const BOARD_HEIGHT = 900;

export const BLOCK_PASS_THROUGH_OCCUPIED = true;
export const BLOCK_OCCUPIED_DESTINATIONS = true;
export const EXACT_N_MOVEMENT = true;

export const EDGE_MOVE_MS = 230;
export const COIN_FLIP_MS = 650;
export const DIVE_RESOLVE_MS = 650;
export const ZONE_TRANSITION_MS = 1100;
