/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the real TS route and game rules in Node with only the Supabase boundary mocked. */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");
const { test, beforeEach } = require("node:test");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const calls = [];
let snapshot;
let rpcError;
let authError;

require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  });
  module._compile(outputText, filename);
};

const supabase = {
  auth: { async getUser() { return { data: { user: authError ? null : { id: "trusted-player" } }, error: authError }; } },
  async rpc(name, parameters) {
    calls.push({ name, parameters });
    return { data: snapshot, error: name === "rightish_room_snapshot" ? null : rpcError };
  },
  from() { throw new Error("Unexpected settings upgrade in test fixture."); },
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "@/lib/supabase/server") return { getServerSupabase: () => supabase };
  const resolved = request.startsWith("@/") ? path.join(root, `${request.slice(2)}.ts`) : request;
  return originalLoad.call(this, resolved, parent, isMain);
};
const { POST } = require("../app/api/rooms/[code]/match/route.ts");
const { angleIt } = require("../lib/games/angle-it-room.ts");
const { settingsForDatabase } = require("../lib/games/settings.ts");

beforeEach(() => {
  calls.length = 0;
  rpcError = null;
  authError = null;
  const settings = settingsForDatabase({ enabledGameIds: ["angle-it"], gameSettings: {
    "angle-it": { roundCount: 5, durationSeconds: 20, options: {} },
  } });
  snapshot = { room: { id: "room", code: "ABC123", host_id: "trusted-player", settings },
    match: { id: "match", phase: "playing", gameId: "angle-it", roundIndex: 0, settings,
      startsAt: new Date(Date.now() - 1000).toISOString(), deadline: new Date(Date.now() + 19000).toISOString(),
      challenge: { seed: "fixed", generatorVersion: 1, targetDegrees: 120 }, myAnswer: null },
  };
});

function request(body, authenticated = true) {
  return POST(new Request("http://rightish.test/api/rooms/ABC123/match", { method: "POST",
    headers: { "Content-Type": "application/json", ...(authenticated ? { authorization: "Bearer test-token" } : {}) },
    body: JSON.stringify(body) }), { params: Promise.resolve({ code: "ABC123" }) });
}

test("Angle It route saves and scores the actual hand position, ignoring a claimed score and player ID", async () => {
  const response = await request({ action: "answer", roundIndex: 0, answer: 115.5, confirm: false,
    score: 1000, result: { score: 1000 }, playerId: "someone-else" });
  assert.equal(response.status, 200);
  const saved = calls.find((call) => call.name === "rightish_submit_round").parameters;
  assert.equal(saved.p_player_id, "trusted-player");
  assert.equal(saved.p_answer, 115.5);
  assert.equal(saved.p_confirm, false);
  assert.equal(saved.p_score, 910);
  assert.deepEqual(saved.p_result, { targetDegrees: 120, guessDegrees: 115.5, differenceDegrees: -4.5, score: 910 });
});

test("Angle It route accepts a zero-degree hand as a real confirmed answer", async () => {
  assert.equal((await request({ action: "answer", roundIndex: 0, answer: 0, confirm: true })).status, 200);
  const saved = calls.find((call) => call.name === "rightish_submit_round").parameters;
  assert.equal(saved.p_answer, 0);
  assert.equal(saved.p_result.guessDegrees, 0);
  assert.equal(saved.p_confirm, true);
});

test("Angle It route rejects invalid or missing confirmed angles without writing a round entry", async () => {
  for (const angle of [-1, 181, "120", { score: 1000 }, null]) {
    calls.length = 0;
    const response = await request({ action: "answer", roundIndex: 0, answer: angle, confirm: true });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "INVALID_ANSWER");
    assert.equal(calls.some((call) => call.name === "rightish_submit_round"), false);
  }
});

test("Angle It route rejects stale rounds and finished phases", async () => {
  assert.equal((await request({ action: "answer", roundIndex: 1, answer: 120, confirm: true })).status, 409);
  snapshot.match.phase = "reveal";
  assert.equal((await request({ action: "answer", roundIndex: 0, answer: 120, confirm: true })).status, 409);
  assert.equal(calls.some((call) => call.name === "rightish_submit_round"), false);
});

test("Angle It route preserves database countdown, deadline, and already-confirmed rejection", async () => {
  for (const code of ["ROUND_NOT_STARTED", "ROUND_CLOSED", "ALREADY_CONFIRMED"]) {
    rpcError = { message: code };
    const response = await request({ action: "answer", roundIndex: 0, answer: 120, confirm: true });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, code);
  }
});

test("Angle It start and next generate server-owned challenges using the game round index", async () => {
  for (const action of ["start", "next"]) {
    snapshot.match.phase = "reveal";
    assert.equal((await request({ action, roundIndex: 0 })).status, 200);
    const call = calls.find((item) => item.name === (action === "start" ? "rightish_start_match" : "rightish_next_round"));
    assert.equal(call.parameters.p_game_id, "angle-it");
    assert.deepEqual(call.parameters.p_challenge, angleIt.generate(call.parameters.p_round_seed, {}, action === "start" ? 0 : 1));
  }
});

test("match route requires authenticated players before accessing room state", async () => {
  assert.equal((await request({ action: "start" }, false)).status, 401);
  assert.equal(calls.length, 0);
});
