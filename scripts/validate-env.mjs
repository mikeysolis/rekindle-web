import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const CONTRACT_DOC_PATH = "docs/specs/ingestion/14_environment_and_secrets_contract.md";
const ENV_FILE_PATHS = [".env.local", ".env", "pipeline/.env"];
const VALID_RUNTIMES = new Set(["studio", "pipeline"]);

function parseRuntimeArg() {
  const args = process.argv.slice(2);
  const runtimeFlagIndex = args.findIndex((arg) => arg === "--runtime");
  if (runtimeFlagIndex === -1) {
    return "studio";
  }

  const value = args[runtimeFlagIndex + 1];
  if (!value || !VALID_RUNTIMES.has(value)) {
    throw new Error(
      `Invalid --runtime value. Use one of: ${Array.from(VALID_RUNTIMES).join(", ")}.`,
    );
  }

  return value;
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  let value = trimmed.slice(separatorIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function loadEnvFile(path) {
  const absolutePath = resolve(process.cwd(), path);
  if (!existsSync(absolutePath)) {
    return;
  }

  const content = readFileSync(absolutePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }

    const [key, value] = parsed;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnvFiles() {
  for (const path of ENV_FILE_PATHS) {
    loadEnvFile(path);
  }
}

function requiredKeysForRuntime(runtime) {
  if (runtime === "pipeline") {
    return ["INGEST_SUPABASE_URL", "INGEST_SUPABASE_SERVICE_ROLE_KEY"];
  }

  return [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "INGEST_SUPABASE_URL",
    "INGEST_SUPABASE_SERVICE_ROLE_KEY",
  ];
}

function collectErrors(runtime) {
  const errors = [];
  const requiredKeys = requiredKeysForRuntime(runtime);

  for (const key of requiredKeys) {
    if (!process.env[key]) {
      errors.push(`Missing required env var: ${key}`);
    }
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    errors.push(
      "Forbidden env var detected: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY (service role keys must never be public).",
    );
  }

  if (process.env.INGEST_SUPABASE_KEY) {
    errors.push(
      "Forbidden env var detected: INGEST_SUPABASE_KEY (use INGEST_SUPABASE_SERVICE_ROLE_KEY only).",
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ingestUrl = process.env.INGEST_SUPABASE_URL;
  if (appUrl && ingestUrl && appUrl === ingestUrl) {
    errors.push(
      "Invalid configuration: NEXT_PUBLIC_SUPABASE_URL and INGEST_SUPABASE_URL must target different projects.",
    );
  }

  return errors;
}

function main() {
  try {
    const runtime = parseRuntimeArg();
    loadLocalEnvFiles();

    const errors = collectErrors(runtime);
    if (errors.length > 0) {
      console.error(`Environment validation failed for runtime "${runtime}":`);
      for (const error of errors) {
        console.error(`- ${error}`);
      }
      console.error(`See ${CONTRACT_DOC_PATH}`);
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    console.error(`See ${CONTRACT_DOC_PATH}`);
    process.exit(1);
  }
}

main();
