/** Angles are in degrees, measured clockwise from 12 o'clock. */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}

/** SVG path for a clockwise arc from `startDeg` to `endDeg`. */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polarToCartesian(cx, cy, radius, startDeg);
  const end = polarToCartesian(cx, cy, radius, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const f = (n: number) => n.toFixed(2);
  return `M ${f(start.x)} ${f(
    start.y,
  )} A ${radius} ${radius} 0 ${largeArc} 1 ${f(end.x)} ${f(end.y)}`;
}

/** Maps a value in [0, max] onto the gauge sweep, clamping out-of-range input. */
export function valueToAngle(
  value: number,
  max: number,
  startDeg: number,
  sweepDeg: number,
): number {
  const ratio = Math.min(1, Math.max(0, value / max));
  return startDeg + ratio * sweepDeg;
}
