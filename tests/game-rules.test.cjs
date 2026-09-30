/* eslint-disable @typescript-eslint/no-require-imports -- Compile the pure TS rules in memory for Node's built-in test runner. */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const ts = require("typescript");

// No application bundler, browser, or additional test dependency is needed.
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { generateShape } = require("../lib/games/split-it/generator.ts");
const { splitIt, isPerfectSplit } = require("../lib/games/split-it/index.ts");
const { polygonArea, clipPolygon, cutFractions, bisectAtAngle } = require("../lib/games/split-it/geometry.ts");
const { selectGame } = require("../lib/games/registry.ts");
const { roundSeed } = require("../lib/games/random.ts");
const { resolveMotionPreference } = require("../lib/preferences/motion.ts");

const square = [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }];
const challenge = (points) => ({ seed: "analytic", generatorVersion: 1, family: "angular", points, color: "#edc46d" });
const horizontal = (y) => ({ a: { x: 0, y }, b: { x: 1, y } });
const vertical = (x) => ({ a: { x, y: 0 }, b: { x, y: 1 } });
const close = (a, b, epsilon = 1e-9) => assert.ok(Math.abs(a - b) <= epsilon, `${a} differs from ${b}`);

test("saved game motion choices override system preferences; unset choices follow the system", () => {
  assert.deepEqual(resolveMotionPreference("false", true), { paused: false, motion: "on" });
  assert.deepEqual(resolveMotionPreference("false", false), { paused: false, motion: "on" });
  assert.deepEqual(resolveMotionPreference("true", false), { paused: true, motion: "off" });
  assert.deepEqual(resolveMotionPreference("true", true), { paused: true, motion: "off" });
  assert.deepEqual(resolveMotionPreference(null, true), { paused: true, motion: "auto" });
  assert.deepEqual(resolveMotionPreference(null, false), { paused: false, motion: "auto" });
});

test("analytic areas and accuracy-only scores", () => {
  close(polygonArea(square), 0.64);
  assert.equal(splitIt.score(challenge(square), horizontal(0.5)).score, 1000);
  assert.equal(splitIt.score(challenge(square), vertical(0.5)).score, 1000);
  assert.equal(splitIt.score(challenge(square), horizontal(0.42)).score, 800);
  assert.equal(splitIt.score(challenge(square), horizontal(0.3)).score, 500);
  assert.equal(splitIt.score(challenge(square), { a: { x: 0, y: 0 }, b: { x: 1, y: 1 } }).score, 1000);
});

test("a concave cut can create multiple fragments on one side and still score their combined area", () => {
  // A U with total area .4; cutting at y=.5 creates two arms with combined area .16.
  const u = [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 },
    { x: 0.7, y: 0.9 }, { x: 0.7, y: 0.3 }, { x: 0.3, y: 0.3 },
    { x: 0.3, y: 0.9 }, { x: 0.1, y: 0.9 }];
  close(polygonArea(u), 0.4);
  close(polygonArea(clipPolygon(u, horizontal(0.5), 1)), 0.16);
  close(polygonArea(clipPolygon(u, horizontal(0.5), -1)), 0.24);
  assert.equal(splitIt.score(challenge(u), horizontal(0.5)).score, 800);
});

test("perfect-split celebrations distinguish equal areas from rounded perfect scores", () => {
  assert.equal(isPerfectSplit(splitIt.score(challenge(square), horizontal(0.5)).fractions), true);
  assert.equal(isPerfectSplit([0.5 + 1e-14, 0.5 - 1e-14]), true);
  assert.equal(isPerfectSplit(null), false);
  const almost = splitIt.score(challenge(square), horizontal(0.50001));
  assert.equal(almost.score, 1000);
  assert.equal(isPerfectSplit(almost.fractions), false);
});

test("rejects missing, malformed, non-finite, too-short and non-crossing cuts", () => {
  for (const answer of [null, undefined, {}, [], { a: { x: NaN, y: 0 }, b: { x: 1, y: 1 } },
    { a: { x: 0, y: Infinity }, b: { x: 1, y: 1 } },
    { a: { x: "0", y: 0 }, b: { x: 1, y: 1 } },
    { a: { x: -1, y: 0.5 }, b: { x: 1, y: 0.5 } },
    { a: { x: 0.5, y: 0.5 }, b: { x: 0.501, y: 0.501 } }, horizontal(0.01), horizontal(0.1)]) {
    assert.equal(splitIt.validateAnswer(challenge(square), answer), false);
    assert.deepEqual(splitIt.score(challenge(square), answer), { score: 0, cut: null, fractions: null, perfectCut: null });
  }
});

test("swipe direction and uniform scaling do not alter the score", () => {
  const cut = { a: { x: 0.2, y: 0 }, b: { x: 0.9, y: 1 } };
  const normal = splitIt.score(challenge(square), cut);
  const reversed = splitIt.score(challenge(square), { a: cut.b, b: cut.a });
  assert.equal(normal.score, reversed.score);
  close(normal.fractions[0], reversed.fractions[1]);
  const transform = (point) => ({ x: 0.15 + point.x * 0.6, y: 0.1 + point.y * 0.6 });
  assert.equal(normal.score, splitIt.score(challenge(square.map(transform)), { a: transform(cut.a), b: transform(cut.b) }).score);
});

function properIntersection(a, b, c, d) {
  const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return orient(a, b, c) * orient(a, b, d) < -1e-18 && orient(c, d, a) * orient(c, d, b) < -1e-18;
}

test("2,000 seeds produce reproducible, bounded, varied shapes and conserved cut areas", () => {
  const families = new Set();
  const silhouettes = new Set();
  for (let seed = 0; seed < 2000; seed++) {
    const shape = generateShape(`stress:${seed}`);
    assert.deepEqual(shape, generateShape(`stress:${seed}`));
    families.add(shape.family);
    silhouettes.add(JSON.stringify(shape.points));
    assert.ok(shape.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0.12 && p.x <= 0.88 && p.y >= 0.12 && p.y <= 0.88));
    const area = polygonArea(shape.points);
    assert.ok(area > 0.09 && area < 0.48, `Unreadable area for ${seed}: ${area}`);
    const cut = { a: { x: 0, y: (seed % 11) / 10 }, b: { x: 1, y: ((seed * 7) % 11) / 10 } };
    close(polygonArea(clipPolygon(shape.points, cut, 1)) + polygonArea(clipPolygon(shape.points, cut, -1)), area);
    const ideal = bisectAtAngle(shape.points, cut);
    close(cutFractions(shape.points, ideal)[0], 0.5);
    if (splitIt.validateAnswer(shape, cut)) {
      const result = splitIt.score(shape, cut);
      assert.ok(Number.isInteger(result.score) && result.score >= 0 && result.score <= 1000);
      const cross = (ideal.b.x - ideal.a.x) * (cut.b.y - cut.a.y) - (ideal.b.y - ideal.a.y) * (cut.b.x - cut.a.x);
      close(cross, 0);
    }
  }
  assert.equal(families.size, 4);
  assert.equal(silhouettes.size, 2000);
});

test("generated outlines have no self-crossings", () => {
  for (let seed = 0; seed < 100; seed++) {
    const points = generateShape(`topology:${seed}`).points;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 2; j < points.length; j++) {
        if (i === 0 && j === points.length - 1) continue;
        assert.equal(properIntersection(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length]), false, `Self-crossing seed ${seed}`);
      }
    }
  }
});

test("match seeds reproduce rounds and game selection respects the enabled list", () => {
  assert.equal(roundSeed("friends", 2), roundSeed("friends", 2));
  assert.notDeepEqual(generateShape(roundSeed("friends", 1)).points, generateShape(roundSeed("friends", 2)).points);
  assert.equal(selectGame(["split-it", "split-it"], "friends"), "split-it");
  assert.equal(selectGame(["unimplemented", "split-it"], "friends"), "split-it");
  assert.throws(() => selectGame([], "friends"), /at least one playable minigame/);
  assert.throws(() => selectGame(["unimplemented"], "friends"), /at least one playable minigame/);
});
