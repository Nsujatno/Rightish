export type Point = { x: number; y: number };
export type Cut = { a: Point; b: Point };

export function signedDistance(point: Point, cut: Cut) {
  const dx = cut.b.x - cut.a.x;
  const dy = cut.b.y - cut.a.y;
  return (dx * (point.y - cut.a.y) - dy * (point.x - cut.a.x)) / Math.hypot(dx, dy);
}

export function polygonArea(points: readonly Point[]) {
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

/** Clip one half-plane. Boundary bridges in concave shapes have zero net area. */
export function clipPolygon(points: readonly Point[], cut: Cut, side: 1 | -1) {
  const clipped: Point[] = [];
  for (let index = 0; index < points.length; index++) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const da = signedDistance(a, cut) * side;
    const db = signedDistance(b, cut) * side;
    if (da >= 0) clipped.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      clipped.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return clipped;
}

export function isCut(input: unknown): input is Cut {
  if (!input || typeof input !== "object" || !("a" in input) || !("b" in input)) return false;
  const isPoint = (point: unknown): point is Point => {
    if (!point || typeof point !== "object" || !("x" in point) || !("y" in point)) return false;
    return typeof point.x === "number" && typeof point.y === "number" &&
      Number.isFinite(point.x) && Number.isFinite(point.y) &&
      point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
  };
  return isPoint(input.a) && isPoint(input.b) && Math.hypot(input.b.x - input.a.x, input.b.y - input.a.y) >= 0.035;
}

export function cutFractions(points: readonly Point[], cut: Cut): [number, number] {
  const fraction = Math.max(0, Math.min(1, polygonArea(clipPolygon(points, cut, 1)) / polygonArea(points)));
  return [fraction, 1 - fraction];
}

export function bisectAtAngle(points: readonly Point[], cut: Cut): Cut {
  const length = Math.hypot(cut.b.x - cut.a.x, cut.b.y - cut.a.y);
  const direction = { x: (cut.b.x - cut.a.x) / length, y: (cut.b.y - cut.a.y) / length };
  const normal = { x: -direction.y, y: direction.x };
  const projections = points.map((point) => normal.x * point.x + normal.y * point.y);
  let low = Math.min(...projections);
  let high = Math.max(...projections);
  const at = (offset: number): Cut => {
    const center = { x: normal.x * offset, y: normal.y * offset };
    return {
      a: { x: center.x - direction.x, y: center.y - direction.y },
      b: { x: center.x + direction.x, y: center.y + direction.y },
    };
  };
  for (let iteration = 0; iteration < 48; iteration++) {
    const middle = (low + high) / 2;
    if (cutFractions(points, at(middle))[0] > 0.5) low = middle;
    else high = middle;
  }
  return at((low + high) / 2);
}

export function extendCut(cut: Cut): Cut {
  const length = Math.hypot(cut.b.x - cut.a.x, cut.b.y - cut.a.y);
  const dx = (cut.b.x - cut.a.x) / length;
  const dy = (cut.b.y - cut.a.y) / length;
  return {
    a: { x: cut.a.x - dx * 2, y: cut.a.y - dy * 2 },
    b: { x: cut.a.x + dx * 2, y: cut.a.y + dy * 2 },
  };
}

export function polygonPath(points: readonly Point[], scale = 1000) {
  return points.length ? `M${points.map((point) => `${point.x * scale},${point.y * scale}`).join("L")}Z` : "";
}

export function polygonCentroid(points: readonly Point[]): Point {
  let crossSum = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < points.length; index++) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    crossSum += cross;
    x += (a.x + b.x) * cross;
    y += (a.y + b.y) * cross;
  }
  return { x: x / (3 * crossSum), y: y / (3 * crossSum) };
}
