export function extractOptions(argv) {
  const opts = {
    listHistory: false,
    recordHistory: true,
    envPath: undefined,
    timeoutMs: undefined,
  };
  const rest = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--history") {
      opts.listHistory = true;
    } else if (a === "--no-history") {
      opts.recordHistory = false;
    } else if (a === "--env") {
      opts.envPath = argv[++i];
      if (opts.envPath === undefined) throw new Error("--env requires a path");
    } else if (a === "--timeout") {
      const v = argv[++i];
      if (v === undefined) throw new Error("--timeout requires a value");
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) throw new Error(`--timeout must be a positive number, got: ${v}`);
      opts.timeoutMs = n;
    } else {
      rest.push(a);
    }
  }

  return { opts, rest };
}
