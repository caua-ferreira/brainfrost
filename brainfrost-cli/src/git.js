import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(args, cwd, { silent = true } = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: silent ? "pipe" : "inherit",
  });
  return {
    ok: result.status === 0,
    out: (result.stdout || "").trim(),
    err: (result.stderr || "").trim(),
  };
}

export function isRepo(cwd) {
  return fs.existsSync(path.join(cwd, ".git")) && run(["rev-parse", "--git-dir"], cwd).ok;
}

export function hasRemote(cwd) {
  const remote = run(["remote"], cwd);
  return remote.ok && remote.out.length > 0;
}

export function pull(cwd) {
  if (!isRepo(cwd)) return { skipped: "sem repositório git" };
  if (!hasRemote(cwd)) return { skipped: "sem remote configurado" };
  const result = run(["pull", "--rebase", "--autostash"], cwd);
  return result.ok
    ? { ok: true, out: result.out }
    : { ok: false, error: result.err || result.out };
}

export function commitAndPush(cwd, message, { push = true } = {}) {
  if (!isRepo(cwd)) return { skipped: "sem repositório git" };

  const staged = run(["add", "-A"], cwd);
  if (!staged.ok) return { ok: false, error: staged.err };

  const pending = run(["status", "--porcelain"], cwd);
  if (pending.ok && pending.out === "") return { ok: true, nothing: true };

  const commit = run(["commit", "-m", message], cwd);
  if (!commit.ok) return { ok: false, error: commit.err || commit.out };

  if (!push) return { ok: true, committed: true, pushed: false };
  if (!hasRemote(cwd)) return { ok: true, committed: true, pushed: false, skipped: "sem remote" };

  const pushed = run(["push"], cwd);
  return pushed.ok
    ? { ok: true, committed: true, pushed: true }
    : { ok: true, committed: true, pushed: false, error: pushed.err || pushed.out };
}

export function lastCommit(cwd) {
  if (!isRepo(cwd)) return null;
  const result = run(["log", "-1", "--pretty=%h %s (%cr)"], cwd);
  return result.ok ? result.out : null;
}
