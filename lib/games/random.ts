/** Versioned generators use this PRNG, never Math.random, for round content. */
export function seededRandom(seed: string) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    value = Math.imul(value ^ seed.charCodeAt(index), 16777619);
  }
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundSeed(matchSeed: string, roundIndex: number) {
  return `${matchSeed}:round:${roundIndex}`;
}
