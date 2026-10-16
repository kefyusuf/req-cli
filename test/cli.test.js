import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { run } from "../src/cli.js";

let server, base;
before(async () => {
  server = createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ path: req.url, auth: req.headers["authorization"] ?? null, body: b || null }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

function fakeDeps({ env = "", history = "" } = {}) {
  const files = { "./.env": env, H: history };
  const written = {};
  return {
    historyPath: "H",
    files,
    written,
    readFile: (p) => {
      if (p in files) return files[p];
      throw new Error(`ENOENT ${p}`);
    },
    writeFile: (p, d) => {
      written[p] = d;
      files[p] = d;
    },
  };
}

test("no args prints help", async () => {
  const { code, out } = await run([], fakeDeps());
  assert.equal(code, 0);
  assert.match(out, /terminal HTTP client/);
});

test("bad args exit code 2", async () => {
  const { code, out } = await run(["GET"], fakeDeps());
  assert.equal(code, 2);
  assert.match(out, /url is required/);
});

test("live request prints status and body, records history", async () => {
  const d = fakeDeps();
  const { code, out } = await run(["GET", `${base}/ping`], d);
  assert.equal(code, 0);
  assert.match(out, /^200 OK/);
  const hist = JSON.parse(d.written.H);
  assert.equal(hist[0].method, "GET");
  assert.equal(hist[0].status, 200);
});

test("--no-history does not write history", async () => {
  const d = fakeDeps();
  await run(["--no-history", "GET", `${base}/x`], d);
  assert.equal(d.written.H, undefined);
});

test("recorded history hides secrets from the url", async () => {
  const d = fakeDeps();
  await run(["GET", `${base}/users?api_key=SECRET`], d);
  const hist = JSON.parse(d.written.H);
  assert.equal(hist[0].url, `${base}/users?api_key=***`);
  assert.doesNotMatch(d.written.H, /SECRET/);
});

test("a history write failure keeps the HTTP result", async () => {
  const d = fakeDeps();
  d.writeFile = () => {
    throw new Error("EACCES history");
  };
  const { code, out } = await run(["GET", `${base}/x`], d);
  assert.equal(code, 0);
  assert.match(out, /^200 OK/);
  assert.match(out, /history not saved \(EACCES history\)/);
});

test("a history write failure does not hide a request error", async () => {
  const d = fakeDeps();
  d.writeFile = () => {
    throw new Error("EACCES history");
  };
  const fetch = async () => {
    const e = new Error("fetch failed");
    e.cause = { code: "ECONNREFUSED" };
    throw e;
  };
  const { code, out } = await run(["GET", "http://127.0.0.1:1/x"], { ...d, fetch });
  assert.equal(code, 1);
  assert.match(out, /ECONNREFUSED/);
  assert.match(out, /history not saved/);
});

test("env vars interpolate into URL and headers", async () => {
  const d = fakeDeps({ env: `BASE=${base}\nTOKEN=abc` });
  const { out } = await run(["--env", "./.env", "GET", "{BASE}/items", "-H", "Authorization:Bearer {TOKEN}"], d);
  assert.match(out, /"auth": "Bearer abc"/);
  assert.match(out, /"path": "\/items"/);
});

test("--history lists recorded entries newest first", async () => {
  const seed = JSON.stringify([
    { at: "2026-01-02T10:00:00.000Z", method: "POST", url: "http://b", status: 201, durationMs: 5 },
    { at: "2026-01-01T10:00:00.000Z", method: "GET", url: "http://a", status: 200, durationMs: 9 },
  ]);
  const { out } = await run(["--history"], fakeDeps({ history: seed }));
  assert.match(out, /POST .*http:\/\/b/);
  assert.ok(out.indexOf("http://b") < out.indexOf("http://a"));
});

test("--history with no entries", async () => {
  const { out } = await run(["--history"], fakeDeps());
  assert.match(out, /no history/);
});

test("connection error shows cause code", async () => {
  const fetch = async () => {
    const e = new Error("fetch failed");
    e.cause = { code: "ECONNREFUSED" };
    throw e;
  };
  const { code, out } = await run(["GET", "http://127.0.0.1:1/x"], { ...fakeDeps(), fetch });
  assert.equal(code, 1);
  assert.match(out, /ECONNREFUSED/);
});
