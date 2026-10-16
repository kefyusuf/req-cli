import { test } from "node:test";
import assert from "node:assert/strict";
import { extractOptions } from "../src/options.js";

test("passes through request args untouched", () => {
  const { opts, rest } = extractOptions(["GET", ":8080/users", "-H", "a:b"]);
  assert.deepEqual(rest, ["GET", ":8080/users", "-H", "a:b"]);
  assert.equal(opts.listHistory, false);
  assert.equal(opts.recordHistory, true); // default on
});

test("--no-history disables recording", () => {
  const { opts, rest } = extractOptions(["--no-history", "GET", "http://x"]);
  assert.equal(opts.recordHistory, false);
  assert.deepEqual(rest, ["GET", "http://x"]);
});

test("--history lists without a URL", () => {
  const { opts, rest } = extractOptions(["--history"]);
  assert.equal(opts.listHistory, true);
  assert.deepEqual(rest, []);
});

test("--env consumes its path", () => {
  const { opts, rest } = extractOptions(["--env", ".env.local", "GET", "http://x"]);
  assert.equal(opts.envPath, ".env.local");
  assert.deepEqual(rest, ["GET", "http://x"]);
});

test("--timeout parses number", () => {
  const { opts } = extractOptions(["--timeout", "500", "GET", "http://x"]);
  assert.equal(opts.timeoutMs, 500);
});

test("--timeout missing value throws", () => {
  assert.throws(() => extractOptions(["--timeout"]), /--timeout requires/);
});
