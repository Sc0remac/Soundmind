/**
 * Compute the Pearson correlation coefficient between two numeric arrays.
 * Returns null if the inputs are not the same length or have fewer than 2 observations.
 */
export function pearsonCorrelation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null;
  const n = x.length;
  const sumX = x.reduce((acc, v) => acc + v, 0);
  const sumY = y.reduce((acc, v) => acc + v, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return null;
  return num / den;
}

/**
 * Compute total training volume.
 * Supports:
 *  - legacy: [{reps, weight}, ...]
 *  - new: [{ exercise_id, exercise_name, sets: [{reps, weight}, ...] }, ...]
 */
export function computeVolume(sets: any): number {
  if (Array.isArray(sets) && sets.length > 0 && "sets" in sets[0]) {
    return sets.reduce((acc: number, item: any) => {
      const sub = (item.sets ?? []).reduce(
        (a: number, s: any) => a + (Number(s.reps || 0) * Number(s.weight || 0)),
        0
      );
      return acc + sub;
    }, 0);
  }
  return (sets ?? []).reduce(
    (a: number, s: any) => a + (Number(s.reps || 0) * Number(s.weight || 0)),
    0
  );
}
