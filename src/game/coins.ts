import { COIN_DISTRIBUTION } from "./constants";
import { createRng, type SeededRng } from "./rng";
import type { Coin, MoveValue } from "./types";

export function createCoinPool(rng: SeededRng, cycle: number): Coin[] {
  return rng.shuffle(COIN_DISTRIBUTION).map((value, index) => ({
    id: `coin-${cycle}-${index}`,
    value,
    state: "hidden",
  }));
}

export function assertCoinDistribution(values: MoveValue[]): void {
  const counts = values.reduce(
    (acc, value) => {
      acc[value] += 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<MoveValue, number>,
  );
  if (counts[1] !== 3 || counts[2] !== 3 || counts[3] !== 3 || counts[4] !== 1) {
    throw new Error(`Invalid coin distribution: ${JSON.stringify(counts)}`);
  }
}

export function createCoinPoolFromSeed(seed: number, cycle = 1): { coins: Coin[]; seed: number } {
  const rng = createRng(seed);
  const coins = createCoinPool(rng, cycle);
  return { coins, seed: rng.seed };
}

export function hiddenCoins(coins: Coin[]): Coin[] {
  return coins.filter((coin) => coin.state === "hidden");
}

export function allCoinsConsumed(coins: Coin[]): boolean {
  return coins.every((coin) => coin.state === "used" || coin.state === "revealed");
}
