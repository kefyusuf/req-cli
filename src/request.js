import { readFileSync } from "node:fs";

async function normalizeResponse(response) {
  const raw = await response.text();
  const base = { status: response.status, statusText: response.statusText };
  const looksJson = (response.headers.get("content-type") ?? "").includes("json");
  if (!looksJson) return { ...base, data: raw, isJson: false };
  try {
    return { ...base, data: JSON.parse(raw), isJson: true };
  } catch {
    return { ...base, data: raw, isJson: false };
  }
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
