import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv, interpolate } from "../src/env.js";

test("parseEnv reads KEY=VALUE lines", () => {
  const vars = parseEnv('TOKEN=abc123\nBASE=http://localhost:3000\n');
  assert.equal(vars.TOKEN, "abc123");
  assert.equal(vars.BASE, "http://localhost:3000");
});

test("parseEnv ignores blank lines and # comments", () => {
  const vars = parseEnv("# a comment\n\nA=1\n  # indented comment\nB=2");
  assert.deepEqual(vars, { A: "1", B: "2" });
});

test("parseEnv strips surrounding quotes", () => {
  const vars = parseEnv('A="quoted"\nB=\'single\'');
  assert.equal(vars.A, "quoted");
  assert.equal(vars.B, "single");
});

test("parseEnv keeps value containing = signs", () => {
  const vars = parseEnv("URL=http://x/?a=b&c=d");
  assert.equal(vars.URL, "http://x/?a=b&c=d");
});

test("parseEnv allows inline export prefix", () => {
  const vars = parseEnv("export TOKEN=xyz");
  assert.equal(vars.TOKEN, "xyz");
});

test("interpolate replaces {var} tokens", () => {
  const r = interpolate("{BASE}/users", { BASE: "http://x:1", TOKEN: "t" });
  assert.equal(r.value, "http://x:1/users");
  assert.deepEqual(r.missing, []);
});

test("interpolate reports missing vars and leaves them intact", () => {
  const r = interpolate("{BASE}/u?k={SECRET}", { BASE: "http://x" });
  assert.equal(r.value, "http://x/u?k={SECRET}");
  assert.deepEqual(r.missing, ["SECRET"]);
});

test("interpolate returns text untouched when no tokens", () => {
  const r = interpolate("plain", {});
  assert.equal(r.value, "plain");
  assert.deepEqual(r.missing, []);
});
