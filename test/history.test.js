import { test } from "node:test";
import assert from "node:assert/strict";
import { appendHistory, loadHistory } from "../src/history.js";

function memStore(initial = "") {
  let data = initial;
  return {
    readFile: () => data,
    writeFile: (d) => { data = d; },
    peek: () => data,
  };
}

test("loadHistory returns [] when file is empty", () => {
  const s = memStore("");
  assert.deepEqual(loadHistory(s), []);
});

test("loadHistory returns [] when readFile throws (missing file)", () => {
  const s = { readFile: () => { throw new Error("ENOENT"); }, writeFile: () => {} };
  assert.deepEqual(loadHistory(s), []);
});

test("appendHistory writes a JSON array entry", () => {
  const s = memStore();
  const entry = { at: "2026-10-14T00:00:00.000Z", method: "GET", url: "http://x", status: 200, durationMs: 10 };
  const out = appendHistory(entry, s);
  assert.equal(out.length, 1);
  assert.deepEqual(JSON.parse(s.peek()), [entry]);
});

test("appendHistory appends newest-first", () => {
  const s = memStore();
  appendHistory({ method: "GET", url: "a" }, s);
  const out = appendHistory({ method: "POST", url: "b" }, s);
  assert.equal(out[0].url, "b");
  assert.equal(out[1].url, "a");
});

test("appendHistory trims to max entries (default 50)", () => {
  const s = memStore();
  for (let i = 0; i < 55; i++) appendHistory({ method: "GET", url: `u${i}` }, s);
  const out = loadHistory(s);
  assert.equal(out.length, 50);
  assert.equal(out[0].url, "u54");
  assert.equal(out[49].url, "u5");
});

test("appendHistory respects custom max", () => {
  const s = { ...memStore(), max: 2 };
  for (let i = 0; i < 4; i++) appendHistory({ url: `u${i}` }, s);
  assert.equal(loadHistory(s).length, 2);
});
