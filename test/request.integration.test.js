import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { sendRequest } from "../src/request.js";
import { parseArgs } from "../src/args.js";

let server;
let base;

before(async () => {
  server = createServer((req, res) => {
    let chunks = "";
    req.on("data", (c) => (chunks += c));
    req.on("end", () => {
      if (req.url === "/boom") {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "kaboom" }));
        return;
      }
      if (req.url === "/slow") {
        setTimeout(() => {
          res.writeHead(200, { "content-type": "text/plain" });
          res.end("late");
        }, 200);
        return;
      }
      if (req.url === "/broken-json") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{bad json");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        method: req.method,
        path: req.url,
        auth: req.headers["authorization"] ?? null,
        echo: chunks || null,
      }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test("GET round-trips through real server", async () => {
  const parsed = parseArgs(["GET", `${base}/users`]);
  const res = await sendRequest(parsed);
  assert.equal(res.status, 200);
  assert.equal(res.data.method, "GET");
  assert.equal(res.data.path, "/users");
});

test("POST sends JSON body and headers for real", async () => {
  const parsed = parseArgs(["POST", `${base}/echo`, "-H", "Authorization:Bearer z", "-d", '{"a":1}']);
  const res = await sendRequest(parsed);
  assert.equal(res.data.auth, "Bearer z");
  assert.deepEqual(JSON.parse(res.data.echo), { a: 1 });
});

test("non-2xx is returned, not thrown", async () => {
  const res = await sendRequest(parseArgs(["GET", `${base}/boom`]));
  assert.equal(res.status, 500);
  assert.deepEqual(res.data, { error: "kaboom" });
});

test("real timeout aborts a slow request", async () => {
  await assert.rejects(
    () => sendRequest(parseArgs(["GET", `${base}/slow`]), { timeoutMs: 20 }),
    /aborted|timeout/i,
  );
});

test("malformed JSON body is returned as raw text", async () => {
  const res = await sendRequest(parseArgs(["GET", `${base}/broken-json`]));
  assert.equal(res.status, 200);
  assert.equal(res.data, "{bad json");
  assert.equal(res.isJson, false);
});
