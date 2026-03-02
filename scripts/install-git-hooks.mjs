import { chmodSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const runGit = (args) => {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() ?? "";
    const stdout = result.stdout?.trim() ?? "";
    throw new Error(stderr || stdout || `git ${args.join(" ")} failed`);
  }
};

try {
  runGit(["config", "core.hooksPath", ".githooks"]);

  const preCommitPath = resolve(process.cwd(), ".githooks", "pre-commit");
  const prePushPath = resolve(process.cwd(), ".githooks", "pre-push");

  chmodSync(preCommitPath, 0o755);
  chmodSync(prePushPath, 0o755);

  console.log("Installed git hooks:");
  console.log("- .githooks/pre-commit");
  console.log("- .githooks/pre-push");
  console.log("core.hooksPath set to .githooks");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
