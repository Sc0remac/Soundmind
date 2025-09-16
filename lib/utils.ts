export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// Basic Pearson correlation for two numeric arrays of equal length
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    sumX += xi; sumY += yi; sumXY += xi * yi; sumX2 += xi * xi; sumY2 += yi * yi;
  }
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

// Compute simple workout volume (sum of reps*weight) from either a flat set list
// or blocks with nested sets
export function computeVolume(sets: any[]): number {
  let vol = 0;
  if (!Array.isArray(sets)) return 0;
  if (sets.length && typeof sets[0] === 'object' && 'sets' in sets[0]) {
    for (const blk of sets) {
      for (const s of blk.sets || []) {
        const reps = typeof s.reps === 'number' ? s.reps : Number(s.r) || 0;
        const weight = typeof s.weight === 'number' ? s.weight : Number(s.w) || 0;
        vol += reps * weight;
      }
    }
  } else {
    for (const s of sets) {
      const reps = typeof s.reps === 'number' ? s.reps : Number(s.r) || 0;
      const weight = typeof s.weight === 'number' ? s.weight : Number(s.w) || 0;
      vol += reps * weight;
    }
  }
  return vol;
}
