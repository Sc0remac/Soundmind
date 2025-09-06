// lib/stats.ts
export function mean(xs: number[]) {
  const arr = xs.filter((n) => Number.isFinite(n));
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;
}
export function sd(xs: number[]) {
  const m = mean(xs);
  const arr = xs.filter((n) => Number.isFinite(n));
  if (!arr.length) return NaN;
  const v = mean(arr.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}
export function diffInMeans(a: number[], b: number[]) {
  return mean(a) - mean(b);
}
export function bucketHour(dateIso: string) {
  const d = new Date(dateIso);
  const h = d.getHours();
  if (h < 10) return "06–09";
  if (h < 13) return "10–12";
  if (h < 17) return "13–16";
  if (h < 21) return "17–20";
  return "21–01";
}
export function bpmBand(bpm?: number | null): string | null {
  if (bpm == null || isNaN(bpm)) return null;
  if (bpm < 110) return "<110";
  if (bpm < 128) return "110–127";
  if (bpm <= 135) return "128–135";
  return ">135";
}
export function confidence(n: number, effectAbs: number) {
  if (n >= 25 && effectAbs >= 0.30) return "high";
  if (n >= 10 && effectAbs >= 0.15) return "medium";
  return "low";
}
