/* eslint-disable @typescript-eslint/no-require-imports -- Test the real pointer handlers without a browser, with React state and SVG coordinates supplied by the harness. */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");
const { test, beforeEach } = require("node:test");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const realReact = require("react");
let hooks;
let cursor;
let changes;
let props;
let captures;
let prevented;

for (const extension of [".ts", ".tsx"]) require.extensions[extension] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: filename,
  });
  module._compile(outputText, filename);
};
require.extensions[".css"] = (module) => { module.exports = new Proxy({}, { get: (_, key) => key }); };
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "react") return { ...realReact,
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], (value) => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = { current: initial };
      return hooks[index];
    },
  };
  if (request === "./shape" && parent.filename.endsWith("round.tsx")) return { ShapeDrawing: () => null };
  let resolved = request;
  if (request.startsWith("@/")) {
    const base = path.join(root, request.slice(2));
    resolved = fs.existsSync(`${base}.ts`) ? `${base}.ts` : path.join(base, "index.ts");
  }
  return originalLoad.call(this, resolved, parent, isMain);
};
global.DOMPoint = class {
  constructor(x, y) { this.x = x; this.y = y; }
  matrixTransform() { return this; }
};
const { SplitItRound } = require("../app/components/games/split-it/round.tsx");
const cut = { a: { x: 0.2, y: 0.5 }, b: { x: 0.8, y: 0.5 } };

beforeEach(() => {
  hooks = [];
  changes = [];
  captures = new Set();
  prevented = 0;
  props = { challenge: { seed: "square", generatorVersion: 1, family: "angular", color: "#edc46d",
    points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }] },
    onAnswerChange: (answer) => changes.push(answer), onConfirm: () => {} };
});

function find(element, predicate) {
  if (!element || typeof element !== "object") return null;
  if (predicate(element)) return element;
  for (const child of [element.props?.children].flat(Infinity)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}
function render() { cursor = 0; return SplitItRound(props); }
function send(handler, x, y, endpoint, pointerType = "touch") {
  const svg = find(render(), (element) => element.type === "svg");
  svg.props[handler]({ pointerId: 1, pointerType, isPrimary: true, button: 0, clientX: x, clientY: y,
    target: { closest: () => endpoint ? { getAttribute: () => endpoint } : null },
    currentTarget: { getScreenCTM: () => ({ inverse: () => ({}) }), focus: () => {},
      setPointerCapture: (id) => captures.add(id), hasPointerCapture: (id) => captures.has(id), releasePointerCapture: (id) => captures.delete(id) },
    preventDefault: () => { prevented++; },
  });
}

test("Split It touch scrolling preserves an existing guess and leaves browser scrolling available", () => {
  props.initialAnswer = cut;
  send("onPointerDown", 500, 500);
  assert.deepEqual(hooks[0], cut);
  assert.equal(hooks[1], null);
  assert.equal(prevented, 0);
  assert.equal(captures.size, 0);
  send("onPointerMove", 500, 560);
  send("onPointerCancel", 500, 560);
  assert.deepEqual(hooks[0], cut);
  assert.equal(hooks[1], null);
  assert.deepEqual(changes, []);
});

test("Split It touch swipes do not place anchors, even when released without pointer cancellation", () => {
  send("onPointerDown", 200, 500);
  send("onPointerMove", 200, 540);
  send("onPointerMove", 200, 500);
  send("onPointerUp", 200, 500);
  assert.equal(hooks[1], null);
  assert.deepEqual(changes, []);
});

test("Split It stationary touch taps place two anchors only on release and save the cut", () => {
  send("onPointerDown", 200, 500);
  assert.equal(hooks[1], null);
  send("onPointerUp", 200, 500);
  assert.deepEqual(hooks[1], cut.a);
  send("onPointerDown", 800, 500);
  assert.deepEqual(changes, []);
  send("onPointerUp", 800, 500);
  assert.deepEqual(changes, [cut]);
  assert.equal(hooks[1], null);
});

test("Split It touch handles still drag and cancelled adjustments restore the saved cut", () => {
  props.initialAnswer = cut;
  send("onPointerDown", 800, 500, "b");
  assert.equal(captures.size, 1);
  assert.equal(prevented, 1);
  send("onPointerMove", 800, 600, "b");
  assert.deepEqual(changes.at(-1), { a: cut.a, b: { x: 0.8, y: 0.6 } });
  send("onPointerCancel", 800, 600, "b");
  assert.deepEqual(changes.at(-1), cut);
});

test("Split It mouse anchor placement still starts on pointer down", () => {
  send("onPointerDown", 200, 500, undefined, "mouse");
  assert.deepEqual(hooks[1], cut.a);
  send("onPointerUp", 200, 500, undefined, "mouse");
  send("onPointerDown", 800, 500, undefined, "mouse");
  send("onPointerUp", 800, 500, undefined, "mouse");
  assert.deepEqual(changes, [cut]);
});

test("Split It an unfinished touch leaving the board does not block the next tap", () => {
  send("onPointerDown", 200, 500);
  find(render(), (element) => element.type === "svg").props.onPointerLeave();
  send("onPointerDown", 300, 500);
  send("onPointerUp", 300, 500);
  assert.deepEqual(hooks[1], { x: 0.3, y: 0.5 });
});
