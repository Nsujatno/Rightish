export function formatSplit(fractions: [number, number]): [string, string] {
  // Round one side and derive the other so the displayed percentages sum to 100.
  const tenths = Math.round(fractions[0] * 1000);
  return [(tenths / 10).toFixed(1), ((1000 - tenths) / 10).toFixed(1)];
}
