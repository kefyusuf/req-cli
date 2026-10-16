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

test("appendHistory masks sensitive query params in the stored url", () => {
  const s = memStore();
  appendHistory({ method: "GET", url: "https://api.example.com/users?api_key=SECRET&name=ann" }, s);
  assert.equal(loadHistory(s)[0].url, "https://api.example.com/users?api_key=***&name=ann");
});

test("appendHistory masks url userinfo", () => {
  const s = memStore();
  appendHistory({ method: "GET", url: "https://user:pw@api.example.com/x" }, s);
  assert.equal(loadHistory(s)[0].url, "https://***@api.example.com/x");
});

test("appendHistory leaves non-secret urls untouched", () => {
  const s = memStore();
  appendHistory({ method: "GET", url: "http://localhost:3000/users?page=2" }, s);
  assert.equal(loadHistory(s)[0].url, "http://localhost:3000/users?page=2");
});

test("appendHistory masks every occurrence of a secret param", () => {
  const s = memStore();
  appendHistory({ method: "GET", url: "https://x/y?token=a&token=b&keep=1" }, s);
  assert.equal(loadHistory(s)[0].url, "https://x/y?token=***&token=***&keep=1");
});

test("appendHistory masks secrets in a url that is not valid", () => {
  const s = memStore();
  appendHistory({ method: "GET", url: "http://my server/x?token=SECRET" }, s);
  assert.equal(loadHistory(s)[0].url, "http://my server/x?token=***");
});

test("appendHistory masks oauth code, password and dotted names", () => {
  const s = memStore();
  appendHistory({ method: "POST", url: "https://x/cb?code=abc&password=pw&a.b.key=k" }, s);
  assert.equal(loadHistory(s)[0].url, "https://x/cb?code=***&password=***&a.b.key=***");
});

test("appendHistory keeps the url as written when masking", () => {
  const s = memStore();
  appendHistory({ method: "GET", url: "HTTP://LocalHost:3000/Users?api_key=S#frag" }, s);
  assert.equal(loadHistory(s)[0].url, "HTTP://LocalHost:3000/Users?api_key=***#frag");
});

test("appendHistory does not mask names that merely contain a secret word", () => {
  const s = memStore();
  appendHistory({ method: "GET", url: "https://x/y?author=ann&monkey=1&sortkey=id" }, s);
  assert.equal(loadHistory(s)[0].url, "https://x/y?author=ann&monkey=1&sortkey=id");
});
