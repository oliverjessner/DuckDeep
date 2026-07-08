export type SeededRng = {
  seed: number;
  nextFloat: () => number;
  nextInt: (maxExclusive: number) => number;
  shuffle: <T>(items: T[]) => T[];
};

export function createRng(seed: number): SeededRng {
  let current = seed >>> 0;
  const nextFloat = () => {
    current = (Math.imul(1664525, current) + 1013904223) >>> 0;
    return current / 0x100000000;
  };

  return {
    get seed() {
      return current >>> 0;
    },
    nextFloat,
    nextInt(maxExclusive: number) {
      return Math.floor(nextFloat() * maxExclusive);
    },
    shuffle<T>(items: T[]) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(nextFloat() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

export function nextSeed(seed: number): number {
  const rng = createRng(seed);
  rng.nextFloat();
  return rng.seed;
}
