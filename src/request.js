import { readFileSync } from "node:fs";

async function normalizeResponse(response) {
  const ct = response.headers.get("content-type") ?? "";
  const looksJson = ct.includes("json");
  let data;
  let isJson = looksJson;
  if (looksJson) {
    try {
      data = await response.json();
    } catch {
      data = await response.text();
      isJson = false;
    }
  } else {
    data = await response.text();
  }
  return { status: response.status, statusText: response.statusText, data, isJson };
}

export async function sendRequest(
  { method, url, headers, body, bodyFile },
  { fetch = globalThis.fetch, readFile = (p) => readFileSync(p, "utf8"), timeoutMs = 10_000 } = {},
) {
  const payload = bodyFile != null ? readFile(bodyFile) : (body ?? undefined);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: payload,
      signal: controller.signal,
    });
    const normalized = await normalizeResponse(response);
    return { ...normalized, durationMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}
