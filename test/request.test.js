import { test } from "node:test";
import assert from "node:assert/strict";
import { sendRequest } from "../src/request.js";

function fakeResponse({ status = 200, statusText = "OK", ct = "application/json", json, text }) {
  const headersMap = { "content-type": ct };
  return {
    status,
    statusText,
    headers: { get: (k) => headersMap[k.toLowerCase()] ?? null },
    async json() {
      if (json === undefined) throw new Error("no json");
      return json;
    },
    async text() {
      return text ?? JSON.stringify(json);
    },
  };
}

test("issues fetch with method, url, headers and returns normalized result", async () => {
  let captured;
  const fetch = async (url, init) => {
    captured = { url, init };
    return fakeResponse({ json: { ok: true } });
  };

  const res = await sendRequest(
    { method: "POST", url: "http://x/a", headers: { Accept: "application/json" }, body: '{"q":1}', bodyFile: null },
    { fetch },
  );

  assert.equal(captured.url, "http://x/a");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers.Accept, "application/json");
  assert.equal(captured.init.body, '{"q":1}');
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, { ok: true });
});

test("parses JSON response when content-type is json", async () => {
  const fetch = async () => fakeResponse({ json: { a: 1 } });
  const res = await sendRequest({ method: "GET", url: "http://x", headers: {} }, { fetch });
  assert.deepEqual(res.data, { a: 1 });
  assert.equal(res.isJson, true);
});

test("keeps text response when not JSON", async () => {
  const fetch = async () => fakeResponse({ ct: "text/plain", text: "hello" });
  const res = await sendRequest({ method: "GET", url: "http://x", headers: {} }, { fetch });
  assert.equal(res.data, "hello");
  assert.equal(res.isJson, false);
});

test("falls back to text when body is malformed JSON", async () => {
  const fetch = async () => fakeResponse({ ct: "application/json", text: "{bad json" });
  const res = await sendRequest({ method: "GET", url: "http://x", headers: {} }, { fetch });
  assert.equal(res.data, "{bad json");
  assert.equal(res.isJson, false);
});

test("does not send a body for GET with none", async () => {
  let captured;
  const fetch = async (url, init) => {
    captured = init;
    return fakeResponse({ json: {} });
  };
  await sendRequest({ method: "GET", url: "http://x", headers: {}, body: null }, { fetch });
  assert.equal(captured.body, undefined);
});

test("reads bodyFile when provided", async () => {
  let captured;
  const fetch = async (url, init) => {
    captured = init;
    return fakeResponse({ json: {} });
  };
  const readFile = () => "FROM_FILE";
  await sendRequest(
    { method: "PUT", url: "http://x", headers: {}, body: null, bodyFile: "p.json" },
    { fetch, readFile },
  );
  assert.equal(captured.body, "FROM_FILE");
});

test("propagates network errors", async () => {
  const fetch = async () => {
    throw new Error("ECONNREFUSED");
  };
  await assert.rejects(
    () => sendRequest({ method: "GET", url: "http://x", headers: {} }, { fetch }),
    /ECONNREFUSED/,
  );
});

test("times out and aborts", async () => {
  const fetch = (url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")));
    });
  await assert.rejects(
    () => sendRequest({ method: "GET", url: "http://x", headers: {} }, { fetch, timeoutMs: 5 }),
    /aborted|timeout/i,
  );
});
