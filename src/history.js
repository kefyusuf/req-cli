const DEFAULT_MAX = 50;

const SECRET_WORDS = new Set([
  "token", "secret", "key", "apikey", "auth", "authorization", "oauth", "session",
  "cookie", "signature", "credential", "cert", "password", "passwd", "pwd", "pass",
  "code", "otp", "pin", "bearer", "ticket",
]);
const REDACTED = "***";

// Raw-text masking: urls that are not valid (parseArgs only checks the scheme) must not leak either.
const isSecretName = (name) =>
  name.toLowerCase().split(/[-_.]+/).some((part) => SECRET_WORDS.has(part));

function maskUrl(url) {
  return url
    .replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@]*@/i, `$1${REDACTED}@`)
    .replace(/([?&])([^=&#]+)=([^&#]*)/g, (whole, sep, name) =>
      isSecretName(name) ? `${sep}${name}=${REDACTED}` : whole,
    );
}

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
  const list = [{ ...entry, url: maskUrl(entry.url) }, ...loadHistory(store)].slice(0, max);
  writeFile(JSON.stringify(list, null, 2));
  return list;
}
