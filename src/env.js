export function parseEnv(text) {
  const vars = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = withoutExport.indexOf("=");
    if (eq === -1) continue;
    const key = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) vars[key] = value;
  }
  return vars;
}

export function interpolate(text, vars) {
  const missing = [];
  const value = String(text).replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (whole, name) => {
    if (Object.hasOwn(vars, name)) return vars[name];
    missing.push(name);
    return whole;
  });
  return { value, missing };
}
