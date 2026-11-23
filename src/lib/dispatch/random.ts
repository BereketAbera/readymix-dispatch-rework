/**
 * Small seeded PRNG (mulberry32). The same seed always produces the same
 * sequence, so the sample board is identical on every load and in tests.
 */
export function createRng(seed: number) {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /** Integer in [min, max], both inclusive. */
    int(min: number, max: number): number {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },
    /** Number in [min, max] rounded to the given step. */
    step(min: number, max: number, stepSize: number): number {
      const steps = Math.round((max - min) / stepSize);
      return min + Math.floor(next() * (steps + 1)) * stepSize;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;
