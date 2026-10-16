const METHODS = new Set([
  "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS",
]);

const NO_BODY_METHODS = new Set(["GET", "HEAD"]);

const isMethodLike = (token) => /^[a-z]+$/i.test(token);

export function parseArgs(argv) {
  const positional = [];
  const headers = {};
  let body = null;
  let bodyFile = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-H") {
      const pair = argv[++i];
      if (pair === undefined) throw new Error("-H requires a name:value pair");
      const idx = pair.indexOf(":");
      if (idx === -1) throw new Error(`Invalid -H value (expected name:value): ${pair}`);
      headers[pair.slice(0, idx)] = pair.slice(idx + 1);
    } else if (arg === "-d") {
      const value = argv[++i];
      if (value === undefined) throw new Error("-d requires a value");
      body = value;
    } else if (arg === "-f") {
      const path = argv[++i];
      if (path === undefined) throw new Error("-f requires a file path");
      bodyFile = path;
    } else if (arg.startsWith("-")) {
      throw new Error(`unknown flag: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  let method = "GET";
  let url;
  let consumed = 1;

  if (positional.length === 0) {
    throw new Error("url is required");
  }

  if (isMethodLike(positional[0])) {
    method = positional[0].toUpperCase();
    if (!METHODS.has(method)) {
      throw new Error(`unsupported method: ${positional[0]}`);
    }
    url = positional[1];
    consumed = 2;
  } else {
    url = positional[0];
  }

  const extra = positional.slice(consumed);
  if (extra.length > 0) {
    throw new Error(`unexpected argument: ${extra.join(" ")}`);
  }

  if (!url) throw new Error("url is required");

  if (body !== null && bodyFile !== null) {
    throw new Error("-d and -f cannot be used together");
  }

  if (NO_BODY_METHODS.has(method) && (body !== null || bodyFile !== null)) {
    throw new Error(`${method} cannot have a body`);
  }

  if (url.startsWith(":")) {
    url = `http://localhost${url}`;
  } else if (!/^https?:\/\//i.test(url)) {
    throw new Error(`url must start with http://, https://, or :PORT — got: ${url}`);
  }

  return { method, url, headers, body, bodyFile };
}
