// lib/stats.ts
export function mean(xs: number[]) {
  const arr = xs.filter((n) => Number.isFinite(n));
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;
}

export function diffInMeans(a: number[], b: number[]) {
  return mean(a) - mean(b);
}

/** Buckets a timestamp into coarse time-of-day groups. */
export function bucketHour(dateIso: string) {
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return "Unknown";
  const h = d.getHours();
  if (h < 10) return "06–09";
  if (h < 13) return "10–12";
  if (h < 17) return "13–16";
  if (h < 21) return "17–20";
  return "21–01";
}

/** Toy confidence heuristic using sample size (n) and absolute effect size. */
export function confidence(n: number, effectAbs: number): "low" | "medium" | "high" {
  if (n >= 25 && effectAbs >= 0.3) return "high";
  if (n >= 10 && effectAbs >= 0.15) return "medium";
  return "low";
}
