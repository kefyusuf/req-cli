import { test } from "node:test";
import assert from "node:assert/strict";
import { realpathSync, symlinkSync, unlinkSync, mkdtempSync, statSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const cliPath = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "cli.js");

function spawn(nodeArgs, { home } = {}) {
  const env = home ? { ...process.env, HOME: home, USERPROFILE: home } : process.env;
  return spawnSync(process.execPath, nodeArgs, { encoding: "utf8", env });
}

test("running the CLI through a symlink prints output", (t) => {
  const linkPath = join(tmpdir(), `req-cli-symlink-${process.pid}.mjs`);
  try {
    symlinkSync(cliPath, linkPath);
  } catch (err) {
    t.skip(`symlinks unavailable: ${err.code}`);
    return;
  }
  t.after(() => unlinkSync(linkPath));

  const res = spawn([linkPath, "--help"]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /terminal HTTP client/);
});

test("running the CLI directly prints output", () => {
  const res = spawn([realpathSync(cliPath), "--help"]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /terminal HTTP client/);
});

test("history is stored owner-only under a private directory", (t) => {
  if (process.platform === "win32") {
    t.skip("permission bits are not enforced on Windows");
    return;
  }
  const home = mkdtempSync(join(tmpdir(), "req-home-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const res = spawn([cliPath, "GET", "http://127.0.0.1:1/x?api_key=SECRET"], { home });
  assert.equal(res.status, 1, res.stderr);

  const history = join(home, ".req", "history.json");
  assert.equal(statSync(history).mode & 0o777, 0o600);
  assert.equal(statSync(join(home, ".req")).mode & 0o777, 0o700);
});
