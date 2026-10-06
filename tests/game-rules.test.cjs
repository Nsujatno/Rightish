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
const { splitIt, isPerfectSplit, isPerfectTarget, isSplitItOptions } = require("../lib/games/split-it/index.ts");
const { polygonArea, clipPolygon, cutFractions, bisectAtAngle } = require("../lib/games/split-it/geometry.ts");
const { selectGame, gameRoundIndex, matchRoundCount, roundSchedule, defaultMatchSettings } = require("../lib/games/registry.ts");
const { parseMatchSettings, gameOptionsFor, gameSettingsFor, needsDatabaseSettingsUpgrade, settingsForDatabase } = require("../lib/games/settings.ts");
const { roundSeed } = require("../lib/games/random.ts");
const { generateFlashGrid, isFlashGridAnswer, scoreFlashGrid, FLASH_GRID_SIZES, FLASH_GRID_LIT_COUNTS } = require("../lib/games/flash-grid.ts");
const { flashGrid } = require("../lib/games/flash-grid-room.ts");
const { INTERNAL_CLOCK_TARGETS, scoreInternalClock, formatClockSeconds, internalClockRoundLimitMs, roomClockElapsedMs } = require("../lib/games/internal-clock.ts");
const { internalClock } = require("../lib/games/internal-clock-room.ts");
const { resolveMotionPreference } = require("../lib/preferences/motion.ts");

const square = [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }];
const challenge = (points) => ({ seed: "analytic", generatorVersion: 1, family: "angular", points, color: "#edc46d" });
const horizontal = (y) => ({ a: { x: 0, y }, b: { x: 1, y } });
const vertical = (x) => ({ a: { x, y: 0 }, b: { x, y: 1 } });
const close = (a, b, epsilon = 1e-9) => assert.ok(Math.abs(a - b) <= epsilon, `${a} differs from ${b}`);

test("Flash Grid creates five seeded grids with unique in-range lights", () => {
  for (let roundIndex = 0; roundIndex < FLASH_GRID_SIZES.length; roundIndex++) {
    const seed = roundSeed("same-five-grids", roundIndex);
    const grid = generateFlashGrid(seed, roundIndex);
    assert.deepEqual(generateFlashGrid(seed, roundIndex), grid);
    assert.equal(grid.size, FLASH_GRID_SIZES[roundIndex]);
    assert.equal(grid.litCells.length, FLASH_GRID_LIT_COUNTS[roundIndex]);
    assert.equal(new Set(grid.litCells).size, grid.litCells.length);
    assert.ok(grid.litCells.every((cell) => cell >= 0 && cell < grid.size * grid.size));
  }
  assert.throws(() => generateFlashGrid("bad", 5), RangeError);
});

test("Flash Grid scores correct picks and penalizes extras without rewarding every-square guesses", () => {
  const grid = { seed: "analytic", generatorVersion: 1, size: 3, litCells: [0, 4, 8] };
  assert.deepEqual(scoreFlashGrid(grid, [8, 0, 4]), { score: 1000, selectedCells: [0, 4, 8], correct: 3, missed: 0, extra: 0 });
  assert.deepEqual(scoreFlashGrid(grid, [0, 1, 4]), { score: 333, selectedCells: [0, 1, 4], correct: 2, missed: 1, extra: 1 });
  assert.equal(scoreFlashGrid(grid, Array.from({ length: 9 }, (_, index) => index)).score, 0);
  assert.equal(scoreFlashGrid(grid, null).score, 0);
  for (const invalid of [[0, 0], [-1], [9], [1.5], ["0"], {}]) {
    assert.equal(isFlashGridAnswer(grid, invalid), false);
    assert.equal(scoreFlashGrid(grid, invalid).score, 0);
  }
});

test("Internal Clock targets rise and timing errors reduce score evenly", () => {
  assert.deepEqual(INTERNAL_CLOCK_TARGETS, [3, 4, 5, 6, 8]);
  assert.equal(internalClockRoundLimitMs(8), 13000);
  assert.equal(scoreInternalClock(8, internalClockRoundLimitMs(8)).score, 0);
  assert.deepEqual(scoreInternalClock(5, 5000), { targetMs: 5000, elapsedMs: 5000, differenceMs: 0, score: 1000 });
  assert.equal(scoreInternalClock(5, 4000).score, 800);
  assert.equal(scoreInternalClock(5, 6000).score, 800);
  assert.equal(scoreInternalClock(5, 10000).score, 0);
  assert.equal(scoreInternalClock(5, 15000).score, 0);
  assert.equal(formatClockSeconds(5123), "5.12");
  for (const [target, actual] of [[0, 1000], [5, -1], [5, Infinity], [NaN, 1000]]) {
    assert.throws(() => scoreInternalClock(target, actual), RangeError);
  }
  assert.throws(() => internalClockRoundLimitMs(0), RangeError);
});

test("Internal Clock room validates 1–30 second targets and scores server-measured stops", () => {
  const rounds = [{ targetSeconds: 1 }, { targetSeconds: 30 }];
  const settings = { enabledGameIds: ["internal-clock"], gameSettings: {
    "internal-clock": { roundCount: 2, durationSeconds: 8, options: { rounds } },
  } };
  assert.deepEqual(parseMatchSettings(settings), settings);
  assert.equal(matchRoundCount(settings), 2);
  const first = internalClock.generate("first", settings.gameSettings["internal-clock"].options, 0);
  const last = internalClock.generate("last", settings.gameSettings["internal-clock"].options, 1);
  assert.equal(first.targetSeconds, 1);
  assert.equal(first.durationSeconds, 6);
  assert.equal(last.targetSeconds, 30);
  assert.equal(last.durationSeconds, 35);
  assert.equal(internalClock.validateAnswer(last, 0), true);
  assert.equal(internalClock.validateAnswer(last, 35000), true);
  assert.equal(internalClock.validateAnswer(last, 35001), false);
  assert.equal(internalClock.validateAnswer(last, 2.5), false);
  assert.equal(internalClock.score(last, 30000).score, 1000);
  assert.equal(internalClock.score(last, null).score, 0);
  const start = "2026-10-05T12:00:00.000Z";
  assert.equal(roomClockElapsedMs(start, Date.parse(start) + 30500, 30), 30500);
  assert.equal(roomClockElapsedMs(start, Date.parse(start) - 100, 30), 0);
  assert.equal(roomClockElapsedMs(start, Date.parse(start) + 50000, 30), 35000);
  assert.throws(() => roomClockElapsedMs("bad", Date.now(), 30), RangeError);
  const invalid = (roundCount, changedRounds, durationSeconds = 8) => ({ enabledGameIds: ["internal-clock"], gameSettings: {
    "internal-clock": { roundCount, durationSeconds, options: { rounds: changedRounds } },
  } });
  for (const value of [
    invalid(0, rounds), invalid(11, rounds), invalid(3, rounds), invalid(2, rounds, 9),
    invalid(2, [{ targetSeconds: 0 }, rounds[1]]),
    invalid(2, [rounds[0], { targetSeconds: 31 }]),
    invalid(2, [{ targetSeconds: 1.5 }, rounds[1]]),
    invalid(2, [{ targetSeconds: "5" }, rounds[1]]),
  ]) assert.equal(parseMatchSettings(value), null);
});

test("mixed matches finish Split It, Flash Grid, then Internal Clock rounds", () => {
  const settings = { enabledGameIds: ["internal-clock", "flash-grid", "split-it"], gameSettings: {
    "split-it": { roundCount: 2, durationSeconds: 20, options: { targetPercent: 50 } },
    "flash-grid": { roundCount: 1, durationSeconds: 23, options: { rounds: [
      { size: 4, studySeconds: 3, recallSeconds: 20 },
    ] } },
    "internal-clock": { roundCount: 2, durationSeconds: 8, options: { rounds: [
      { targetSeconds: 5 }, { targetSeconds: 12 },
    ] } },
  } };
  assert.deepEqual([0, 1, 2, 3, 4].map((index) => selectGame(settings, index)),
    ["split-it", "split-it", "flash-grid", "internal-clock", "internal-clock"]);
  assert.equal(internalClock.generate("second", settings.gameSettings["internal-clock"].options,
    gameRoundIndex(settings, 4)).targetSeconds, 12);
});

test("Flash Grid room settings validate every round and generate the chosen size and timing", () => {
  const rounds = [
    { size: 7, studySeconds: 1, recallSeconds: 5 },
    { size: 3, studySeconds: 15, recallSeconds: 60 },
  ];
  const settings = { enabledGameIds: ["flash-grid"], gameSettings: {
    "flash-grid": { roundCount: 2, durationSeconds: 23, options: { rounds } },
  } };
  assert.deepEqual(parseMatchSettings(settings), settings);
  assert.equal(matchRoundCount(settings), 2);
  for (let index = 0; index < rounds.length; index++) {
    const grid = flashGrid.generate(`room:${index}`, settings.gameSettings["flash-grid"].options, index);
    assert.equal(grid.size, rounds[index].size);
    assert.equal(grid.studySeconds, rounds[index].studySeconds);
    assert.equal(grid.recallSeconds, rounds[index].recallSeconds);
    assert.equal(grid.durationSeconds, rounds[index].studySeconds + rounds[index].recallSeconds);
    assert.deepEqual(flashGrid.generate(`room:${index}`, settings.gameSettings["flash-grid"].options, index), grid);
    assert.equal(flashGrid.validateAnswer(grid, [0, 1]), true);
    assert.equal(flashGrid.validateAnswer(grid, [0, grid.size * grid.size]), false);
    assert.deepEqual(flashGrid.score(grid, grid.litCells).score, 1000);
  }
  const invalid = (roundCount, changedRounds, durationSeconds = 23) => ({ enabledGameIds: ["flash-grid"], gameSettings: {
    "flash-grid": { roundCount, durationSeconds, options: { rounds: changedRounds } },
  } });
  for (const value of [
    invalid(0, rounds), invalid(11, rounds), invalid(3, rounds), invalid(2, rounds, 24),
    invalid(2, [{ ...rounds[0], size: 2 }, rounds[1]]),
    invalid(2, [{ ...rounds[0], size: 8 }, rounds[1]]),
    invalid(2, [{ ...rounds[0], studySeconds: 0 }, rounds[1]]),
    invalid(2, [{ ...rounds[0], studySeconds: 16 }, rounds[1]]),
    invalid(2, [{ ...rounds[0], recallSeconds: 4 }, rounds[1]]),
    invalid(2, [{ ...rounds[0], recallSeconds: 61 }, rounds[1]]),
    invalid(2, [{ ...rounds[0], recallSeconds: 7.5 }, rounds[1]]),
  ]) assert.equal(parseMatchSettings(value), null);
});

test("mixed matches select the correct Flash Grid round configuration", () => {
  const settings = { enabledGameIds: ["split-it", "flash-grid"], gameSettings: {
    "split-it": { roundCount: 2, durationSeconds: 20, options: { targetPercent: 50 } },
    "flash-grid": { roundCount: 2, durationSeconds: 23, options: { rounds: [
      { size: 4, studySeconds: 2, recallSeconds: 10 },
      { size: 6, studySeconds: 4, recallSeconds: 30 },
    ] } },
  } };
  assert.deepEqual([0, 1, 2, 3].map((index) => selectGame(settings, index)),
    ["split-it", "split-it", "flash-grid", "flash-grid"]);
  assert.deepEqual([0, 1, 2, 3].map((index) => selectGame({ ...settings,
    enabledGameIds: ["flash-grid", "split-it"] }, index)),
    ["split-it", "split-it", "flash-grid", "flash-grid"]);
  assert.equal(gameRoundIndex(settings, 2), 0);
  assert.equal(gameRoundIndex(settings, 3), 1);
  assert.equal(flashGrid.generate("second", settings.gameSettings["flash-grid"].options, gameRoundIndex(settings, 3)).size, 6);
});

test("game motion starts on and preserves an explicit off choice", () => {
  assert.deepEqual(resolveMotionPreference(null), { paused: false, motion: "on" });
  assert.deepEqual(resolveMotionPreference("false"), { paused: false, motion: "on" });
  assert.deepEqual(resolveMotionPreference("true"), { paused: true, motion: "off" });
});

test("analytic areas and accuracy-only scores", () => {
  close(polygonArea(square), 0.64);
  assert.equal(splitIt.score(challenge(square), horizontal(0.5)).score, 1000);
  assert.equal(splitIt.score(challenge(square), vertical(0.5)).score, 1000);
  assert.equal(splitIt.score(challenge(square), horizontal(0.42)).score, 800);
  assert.equal(splitIt.score(challenge(square), horizontal(0.3)).score, 500);
  assert.equal(splitIt.score(challenge(square), { a: { x: 0, y: 0 }, b: { x: 1, y: 1 } }).score, 1000);
});

test("custom targets accept either side and score relative to the smaller requested piece", () => {
  const eighty = { targetPercent: 80 };
  const result = splitIt.score(challenge(square), horizontal(0.26), eighty);
  assert.equal(result.score, 1000);
  close(Math.min(...cutFractions(square, result.perfectCut)), 0.2);
  assert.equal(splitIt.score(challenge(square), horizontal(0.74), eighty).score, 1000);
  assert.equal(splitIt.score(challenge(square), horizontal(0.30), eighty).score, 750);
  assert.equal(splitIt.score(challenge(square), horizontal(0.42), eighty).score, 0);
  assert.equal(isPerfectTarget(splitIt.score(challenge(square), horizontal(0.26), eighty).fractions, 80), true);
  assert.equal(isSplitItOptions({ targetPercent: 80 }), true);
  assert.equal(isSplitItOptions({ targetPercent: 85 }), false);
  assert.equal(isSplitItOptions({ targetPercent: 62 }), false);
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
  const settings = { enabledGameIds: ["split-it"], gameSettings: {
    "split-it": { roundCount: 3, durationSeconds: 20, options: { targetPercent: 50 } },
  } };
  assert.equal(matchRoundCount(settings), 3);
  for (let round = 0; round < 3; round++) assert.equal(selectGame(settings, round), "split-it");
  assert.deepEqual(roundSchedule(["split-it", "future-game"], { "split-it": 2, "future-game": 3 }),
    ["split-it", "split-it", "future-game", "future-game", "future-game"]);
  assert.deepEqual(roundSchedule(["future-game", "split-it"], { "split-it": 2, "future-game": 3 }),
    ["future-game", "future-game", "future-game", "split-it", "split-it"]);
  assert.throws(() => selectGame(settings, 3), /No game configured/);
  assert.throws(() => selectGame({ enabledGameIds: [], gameSettings: {} }, 0), /at least one playable minigame/);
});

test("host settings accept only playable games, valid timers, and valid game options", () => {
  const settings = {
    enabledGameIds: ["split-it"], gameSettings: {
      "split-it": { roundCount: 10, durationSeconds: 5, options: { targetPercent: 80 } },
    },
  };
  assert.deepEqual(parseMatchSettings(settings), settings);
  assert.deepEqual(gameOptionsFor(settings, "split-it"), { targetPercent: 80 });
  assert.deepEqual(gameSettingsFor(settings, "split-it"), settings.gameSettings["split-it"]);
  const invalidSplitIt = (change) => ({ ...settings, gameSettings: {
    "split-it": { ...settings.gameSettings["split-it"], ...change },
  } });
  for (const invalid of [
    invalidSplitIt({ roundCount: 0 }), invalidSplitIt({ roundCount: 11 }),
    invalidSplitIt({ durationSeconds: 4 }), invalidSplitIt({ durationSeconds: 61 }),
    { ...settings, enabledGameIds: [] },
    { ...settings, enabledGameIds: ["unimplemented"] },
    { ...settings, enabledGameIds: ["split-it", "split-it"] },
    invalidSplitIt({ options: { targetPercent: 85 } }),
  ]) assert.equal(parseMatchSettings(invalid), null);
});

test("saved rooms with the original settings shape upgrade without losing host choices", () => {
  assert.deepEqual(parseMatchSettings({
    enabledGameIds: ["split-it"], roundCount: 5, durationSeconds: 20,
    gameOptions: { "split-it": { targetPercent: 50 } },
  }), defaultMatchSettings);
  const legacy = {
    enabledGameIds: ["split-it"], roundCount: 7, durationSeconds: 35,
    gameOptions: { "split-it": { targetPercent: 70 } },
  };
  const current = {
    enabledGameIds: ["split-it"], gameSettings: {
      "split-it": { roundCount: 7, durationSeconds: 35, options: { targetPercent: 70 } },
    },
  };
  assert.deepEqual(parseMatchSettings(legacy), current);
  assert.equal(needsDatabaseSettingsUpgrade(legacy, current), true);
  assert.deepEqual(parseMatchSettings(settingsForDatabase(current)), current);
  assert.equal(needsDatabaseSettingsUpgrade(settingsForDatabase(current), current), false);
  assert.deepEqual(settingsForDatabase(current), { ...current, roundCount: 7, durationSeconds: 35,
    gameOptions: legacy.gameOptions });
  assert.equal(parseMatchSettings({ ...legacy, roundCount: 11 }), null);
});
