#!/usr/bin/env node
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { parseArgs } from "./args.js";
import { sendRequest } from "./request.js";
import { extractOptions } from "./options.js";
import { parseEnv, interpolate } from "./env.js";
import { appendHistory, loadHistory } from "./history.js";
import { format, formatHistory } from "./output.js";

const HELP = `req — terminal HTTP client

  req [METHOD] URL [-H name:value]... [-d body | -f file] [--env path] [--timeout ms] [--no-history]
  req --history

  URL may be :PORT/path (→ http://localhost) or a full http(s) URL.
  Use {VAR} in URL/header values/body; values come from --env (default ./.env).

Examples:
  req :8080/users
  req POST :3000/login -H Content-Type:application/json -d '{"u":"a"}'
  req --env .env GET '{BASE}/items' -H 'Auth:Bearer {TOKEN}'`;

function defaultDeps() {
  const historyPath = join(homedir(), ".req", "history.json");
  return {
    historyPath,
    readFile: (p) => readFileSync(p, "utf8"),
    writeFile: (p, data) => {
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, data);
    },
  };
}

function loadVars(envPath, readFile) {
  if (!envPath) return {};
  try {
    return parseEnv(readFile(envPath));
  } catch {
    return {};
  }
}

function interpolateArgs(argv, vars) {
  return argv.map((tok) => interpolate(tok, vars).value);
}

export async function run(argv, injected = {}) {
  const deps = { ...defaultDeps(), ...injected };
  const { fetch = globalThis.fetch } = injected;

  let opts, rest;
  try {
    ({ opts, rest } = extractOptions(argv));
  } catch (err) {
    return { code: 2, out: `req: ${err.message}` };
  }

  const historyStore = {
    readFile: () => deps.readFile(deps.historyPath),
    writeFile: (data) => deps.writeFile(deps.historyPath, data),
  };

  if (opts.listHistory) {
    return { code: 0, out: formatHistory(loadHistory(historyStore)) };
  }
  if (rest.length === 0 || rest.includes("-h") || rest.includes("--help")) {
    return { code: 0, out: HELP };
  }

  let parsed;
  try {
    const vars = loadVars(opts.envPath ?? safeFindEnv(deps), deps.readFile);
    parsed = parseArgs(interpolateArgs(rest, vars));
  } catch (err) {
    return { code: 2, out: `req: ${err.message}` };
  }

  try {
    const res = await sendRequest(parsed, {
      fetch,
      readFile: (p) => deps.readFile(p),
      ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
    });
    if (opts.recordHistory) {
      appendHistory(
        { at: new Date().toISOString(), method: parsed.method, url: parsed.url, status: res.status, durationMs: res.durationMs },
        historyStore,
      );
    }
    return { code: res.status >= 400 ? 1 : 0, out: format(res) };
  } catch (err) {
    if (opts.recordHistory) {
      appendHistory(
        { at: new Date().toISOString(), method: parsed.method, url: parsed.url, error: err.cause?.code ?? err.message },
        historyStore,
      );
    }
    return { code: 1, out: format({ error: err.cause?.code ?? err.message }) };
  }
}

function safeFindEnv(deps) {
  try {
    deps.readFile("./.env");
    return "./.env";
  } catch {
    return undefined;
  }
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  try {
    const self = pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;
    return self === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  const { code, out } = await run(process.argv.slice(2));
  console.log(out);
  process.exit(code);
}
