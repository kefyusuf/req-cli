function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => ((acc[k] = sortKeys(value[k])), acc), {});
  }
  return value;
}

export function format(result) {
  if (result.error) {
    return `✗ error: ${result.error}`;
  }
  const header = `${result.status} ${result.statusText}  ·  ${result.durationMs}ms`;
  const body = result.data;
  if (body === "" || body === null || body === undefined) {
    return `${header}\n(no body)`;
  }
  const rendered = result.isJson
    ? JSON.stringify(sortKeys(body), null, 2)
    : String(body);
  return `${header}\n\n${rendered}`;
}

export function formatHistory(list) {
  if (!list || list.length === 0) return "(no history yet)";
  return list
    .map((e) => {
      const time = e.at ? e.at.slice(0, 16).replace("T", " ") : "----";
      const outcome = e.error ? `ERR ${e.error}` : `${e.status}`;
      return `${time}  ${e.method.padEnd(6)}  ${String(outcome).padEnd(10)} ${e.url}`;
    })
    .join("\n");
}
