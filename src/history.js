const DEFAULT_MAX = 50;

export function loadHistory({ readFile, max = DEFAULT_MAX }) {
  let raw;
  try {
    raw = readFile();
  } catch {
    return [];
  }
  if (!raw || !raw.trim()) return [];
  let list;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  return list.slice(0, max);
}

export function appendHistory(entry, store) {
  const { writeFile, max = DEFAULT_MAX } = store;
  const list = [entry, ...loadHistory(store)].slice(0, max);
  writeFile(JSON.stringify(list, null, 2));
  return list;
}
