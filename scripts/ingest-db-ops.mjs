import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const CLEANUP_SQL_PATH = "ingestion/supabase/sql/cleanup_ingestion_tables.sql";
const LINKED_RESET_COMMAND = [
  "db",
  "reset",
  "--linked",
  "--workdir",
  "./ingestion",
  "--no-seed",
];
const LOCAL_RESET_COMMAND = ["db", "reset", "--workdir", "./ingestion", "--no-seed"];
const PRODUCTION_ENVIRONMENTS = new Set(["prod", "production", "live"]);

function parseFlags(args) {
  const flags = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return flags;
}

function normalizeEnvironment(value) {
  return value.trim().toLowerCase();
}

function usageAndExit() {
  console.error("Ingestion DB operations");
  console.error("");
  console.error("Commands:");
  console.error("  cleanup-sql");
  console.error("  reset-local --allow-local-reset --environment <env> --confirm reset-<env> [--dry-run]");
  console.error(
    "  reset-linked --allow-linked-reset --environment <env> --confirm reset-<env> [--dry-run]",
  );
  console.error("");
  console.error("Notes:");
  console.error("  - reset-linked is blocked for production-like environments.");
  console.error("  - both reset commands require INGEST_ENVIRONMENT to match --environment.");
  process.exit(1);
}

function printCleanupSql() {
  const absolute = resolve(process.cwd(), CLEANUP_SQL_PATH);
  const sql = readFileSync(absolute, "utf8");
  console.log(`# Cleanup SQL (${CLEANUP_SQL_PATH})`);
  console.log(sql.trimEnd());
}

function assertResetGuardrails({
  flags,
  expectedAllowFlag,
  resetKind,
}) {
  if (!flags[expectedAllowFlag]) {
    throw new Error(
      `Blocked ${resetKind} reset. Re-run with --${expectedAllowFlag} and explicit confirmation flags.`,
    );
  }

  const requestedEnvironmentRaw = typeof flags.environment === "string" ? flags.environment : "";
  if (!requestedEnvironmentRaw) {
    throw new Error(`Missing --environment for ${resetKind} reset.`);
  }

  const runtimeEnvironmentRaw = process.env.INGEST_ENVIRONMENT ?? "";
  if (!runtimeEnvironmentRaw) {
    throw new Error(
      "Missing INGEST_ENVIRONMENT. Set INGEST_ENVIRONMENT and ensure it matches --environment.",
    );
  }

  const requestedEnvironment = normalizeEnvironment(requestedEnvironmentRaw);
  const runtimeEnvironment = normalizeEnvironment(runtimeEnvironmentRaw);

  if (requestedEnvironment !== runtimeEnvironment) {
    throw new Error(
      `Environment mismatch: --environment=${requestedEnvironmentRaw} does not match INGEST_ENVIRONMENT=${runtimeEnvironmentRaw}.`,
    );
  }

  if (resetKind === "linked" && PRODUCTION_ENVIRONMENTS.has(requestedEnvironment)) {
    throw new Error(
      `Blocked linked reset for environment "${requestedEnvironmentRaw}". Linked reset is never allowed for production-like environments.`,
    );
  }

  const expectedConfirm = `reset-${requestedEnvironment}`;
  if (flags.confirm !== expectedConfirm) {
    throw new Error(
      `Invalid --confirm value. Expected "${expectedConfirm}" for environment "${requestedEnvironmentRaw}".`,
    );
  }
}

function runSupabaseReset(commandArgs, dryRun) {
  const fullCommand = ["supabase", ...commandArgs].join(" ");
  if (dryRun) {
    console.log(`DRY RUN: ${fullCommand}`);
    return;
  }

  const result = spawnSync("supabase", commandArgs, { stdio: "inherit" });
  if (typeof result.status === "number") {
    process.exit(result.status);
  }

  process.exit(1);
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    usageAndExit();
  }

  if (command === "cleanup-sql") {
    printCleanupSql();
    return;
  }

  if (command !== "reset-local" && command !== "reset-linked") {
    usageAndExit();
  }

  const flags = parseFlags(args);
  const dryRun = Boolean(flags["dry-run"]);
  const resetKind = command === "reset-linked" ? "linked" : "local";
  const expectedAllowFlag =
    command === "reset-linked" ? "allow-linked-reset" : "allow-local-reset";

  assertResetGuardrails({
    flags,
    expectedAllowFlag,
    resetKind,
  });

  const commandArgs = command === "reset-linked" ? LINKED_RESET_COMMAND : LOCAL_RESET_COMMAND;
  runSupabaseReset(commandArgs, dryRun);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
