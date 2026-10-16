import { test } from "node:test";
import assert from "node:assert/strict";
import { format } from "../src/output.js";

test("formats a JSON response with status line and pretty body", () => {
  const out = format({ status: 200, statusText: "OK", durationMs: 12, isJson: true, data: { b: 2, a: 1 } });
  assert.match(out, /^200 OK .*12ms/);
  assert.match(out, /"a": 1/);
  // keys sorted for stable output
  assert.ok(out.indexOf('"a"') < out.indexOf('"b"'));
});

test("formats a plain-text response as-is", () => {
  const out = format({ status: 201, statusText: "Created", durationMs: 3, isJson: false, data: "hello" });
  assert.match(out, /^201 Created/);
  assert.match(out, /hello/);
});

test("formats an error result", () => {
  const out = format({ error: "ECONNREFUSED" });
  assert.match(out, /error/i);
  assert.match(out, /ECONNREFUSED/);
});

test("empty body shows a marker", () => {
  const out = format({ status: 204, statusText: "No Content", durationMs: 1, isJson: false, data: "" });
  assert.match(out, /204 No Content/);
});
