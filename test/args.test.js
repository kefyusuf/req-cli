import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/args.js";

test("positional METHOD and URL", () => {
  const r = parseArgs(["GET", "http://localhost:8080/users"]);
  assert.equal(r.method, "GET");
  assert.equal(r.url, "http://localhost:8080/users");
  assert.deepEqual(r.headers, {});
  assert.equal(r.body, null);
});

test("default method is GET when only URL given", () => {
  const r = parseArgs(["http://example.com"]);
  assert.equal(r.method, "GET");
  assert.equal(r.url, "http://example.com");
});

test(":PORT shorthand resolves to http://localhost:PORT", () => {
  const r = parseArgs(["GET", ":8080/users"]);
  assert.equal(r.url, "http://localhost:8080/users");
});

test("method is case-insensitive, uppercased", () => {
  const r = parseArgs(["post", "http://x"]);
  assert.equal(r.method, "POST");
});

test("repeated -H flags accumulate headers", () => {
  const r = parseArgs([
    "GET", "http://x",
    "-H", "Authorization:Bearer t0ken",
    "-H", "Accept:application/json",
  ]);
  assert.deepEqual(r.headers, {
    Authorization: "Bearer t0ken",
    Accept: "application/json",
  });
});

test("header value may contain colons", () => {
  const r = parseArgs(["GET", "http://x", "-H", "X-Url:http://a/b"]);
  assert.equal(r.headers["X-Url"], "http://a/b");
});

test("-d sets raw body string", () => {
  const r = parseArgs(["POST", "http://x", "-d", '{"a":1}']);
  assert.equal(r.body, '{"a":1}');
});

test("-f sets bodyFile path (does not read yet)", () => {
  const r = parseArgs(["POST", "http://x", "-f", "./payload.json"]);
  assert.equal(r.bodyFile, "./payload.json");
});

test("unknown method throws", () => {
  assert.throws(
    () => parseArgs(["BREW", "http://x"]),
    /unsupported method/i,
  );
});

test("unknown flag throws", () => {
  assert.throws(
    () => parseArgs(["GET", "http://x", "--wat"]),
    /unknown flag/,
  );
});

test("missing URL throws", () => {
  assert.throws(() => parseArgs(["GET"]), /url is required/);
});

test("empty argv throws", () => {
  assert.throws(() => parseArgs([]), /url is required/);
});

test("-H without value throws", () => {
  assert.throws(() => parseArgs(["GET", "http://x", "-H"]), /-H requires/);
});

test("-d without value throws", () => {
  assert.throws(() => parseArgs(["POST", "http://x", "-d"]), /-d requires a value/);
});

test("-H value without colon throws", () => {
  assert.throws(() => parseArgs(["GET", "http://x", "-H", "oops"]), /Invalid -H/);
});

test("extra positional arguments throw", () => {
  assert.throws(() => parseArgs(["GET", "http://x", "unexpected"]), /unexpected argument: unexpected/);
  assert.throws(() => parseArgs(["http://x", "one", "two"]), /unexpected argument: one/);
});

test("-d together with -f throws", () => {
  assert.throws(
    () => parseArgs(["POST", "http://x", "-d", "inline", "-f", "p.json"]),
    /-d and -f cannot be used together/,
  );
});

test("body on GET or HEAD throws", () => {
  assert.throws(() => parseArgs(["GET", "http://x", "-d", "a"]), /GET cannot have a body/);
  assert.throws(() => parseArgs(["HEAD", "http://x", "-f", "p.json"]), /HEAD cannot have a body/);
});
