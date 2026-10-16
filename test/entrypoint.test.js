import { test } from "node:test";
import assert from "node:assert/strict";
import { realpathSync, symlinkSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const cliPath = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "cli.js");

function spawn(nodeArgs) {
  return spawnSync(process.execPath, nodeArgs, { encoding: "utf8" });
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
