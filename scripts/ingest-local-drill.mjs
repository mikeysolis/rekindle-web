import { spawnSync } from "node:child_process";

const DEFAULT_SOURCES = ["rak", "ggia"];

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {
    run: false,
    sources: [...DEFAULT_SOURCES],
    skipSourceRuns: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--run") {
      flags.run = true;
      continue;
    }

    if (arg === "--print") {
      flags.run = false;
      continue;
    }

    if (arg === "--skip-source-runs") {
      flags.skipSourceRuns = true;
      continue;
    }

    if (arg === "--sources") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --sources (comma-separated source keys)");
      }

      const parsed = value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (parsed.length === 0) {
        throw new Error("--sources must include at least one source key");
      }

      flags.sources = parsed;
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      flags.help = true;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return flags;
}

function printUsage() {
  console.log("Ingestion local drill helper");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/ingest-local-drill.mjs [--print]");
  console.log("  node scripts/ingest-local-drill.mjs --run [--sources rak,ggia] [--skip-source-runs]");
  console.log("");
  console.log("Modes:");
  console.log("  --print             Print checklist only (default)");
  console.log("  --run               Execute automated safe steps");
}

function printChecklist({ sources }) {
  console.log("Ingestion Local Drill Checklist");
  console.log("Date:", new Date().toISOString());
  console.log("");
  console.log("1) Preflight");
  console.log("  - node scripts/validate-env.mjs --runtime studio");
  console.log("  - node scripts/validate-env.mjs --runtime pipeline");
  console.log("  - supabase status --workdir ./db");
  console.log("  - supabase status --workdir ./ingestion");
  console.log("");
  console.log("2) Generate ingestion data");
  console.log("  - npm run pipeline:list-sources");
  console.log("  - npm run pipeline:source-health");
  for (const source of sources) {
    console.log(`  - npm run pipeline:run-source -- ${source} --force`);
  }
  console.log("  - npm run pipeline:incident-alerts");
  console.log("");
  console.log("3) Studio workflow practice (manual)");
  console.log("  - Open /studio/ingestion");
  console.log("  - Perform one Reject, one Needs Work, one Promote to Draft");
  console.log("  - Verify /studio/drafts receives promoted item(s)");
  console.log("");
  console.log("4) Replay workflow practice (manual)");
  console.log("  - Copy runId from run-source command output");
  console.log("  - npm run pipeline:replay-run -- <RUN_ID>");
  console.log("  - npm run pipeline:replay-run -- <RUN_ID> --config-version 999");
  console.log("");
  console.log("5) Optional source onboarding practice");
  console.log("  - npm run pipeline:source-probe -- https://example.org --approval-action pending_review");
  console.log("");
  console.log("6) Cleanup for repeat drills");
  console.log("  - npm run ingest:cleanup:sql");
  console.log("  - Apply ingestion/supabase/sql/cleanup_ingestion_tables.sql to local ingestion DB");
  console.log("");
  console.log("Reference: docs/specs/ingestion/17_system_usage_guide.md");
}

function runCommand({ label, cmd, args }) {
  console.log(`\n==> ${label}`);
  console.log(`$ ${cmd} ${args.join(" ")}`);

  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: false,
  });

  const status = typeof result.status === "number" ? result.status : 1;
  if (status !== 0) {
    throw new Error(`${label} failed with exit code ${status}`);
  }
}

function runDrill({ sources, skipSourceRuns }) {
  console.log("Running automated local drill steps...");
  console.log(
    "Note: supabase status checks are not executed in --run mode to avoid logging local keys/secrets."
  );

  const steps = [
    {
      label: "Validate studio env",
      cmd: "node",
      args: ["scripts/validate-env.mjs", "--runtime", "studio"],
    },
    {
      label: "Validate pipeline env",
      cmd: "node",
      args: ["scripts/validate-env.mjs", "--runtime", "pipeline"],
    },
    {
      label: "List pipeline sources",
      cmd: "npm",
      args: ["run", "pipeline:list-sources"],
    },
    {
      label: "Inspect source health",
      cmd: "npm",
      args: ["run", "pipeline:source-health"],
    },
  ];

  for (const step of steps) {
    runCommand(step);
  }

  if (!skipSourceRuns) {
    for (const source of sources) {
      runCommand({
        label: `Run source ${source} (force cadence bypass only)`,
        cmd: "npm",
        args: ["run", "pipeline:run-source", "--", source, "--force"],
      });
    }
  }

  runCommand({
    label: "Inspect incident alerts",
    cmd: "npm",
    args: ["run", "pipeline:incident-alerts"],
  });

  console.log("\nAutomated steps complete.");
  console.log("Next manual steps:");
  console.log("1) In Studio, perform Reject / Needs Work / Promote actions.");
  console.log("2) Use a runId from run-source output to run replay commands:");
  console.log("   npm run pipeline:replay-run -- <RUN_ID>");
  console.log("   npm run pipeline:replay-run -- <RUN_ID> --config-version 999");
  console.log("3) Optional: npm run pipeline:source-probe -- https://example.org --approval-action pending_review");
}

try {
  const flags = parseArgs(process.argv);

  if (flags.help) {
    printUsage();
    process.exit(0);
  }

  if (flags.run) {
    runDrill(flags);
  } else {
    printChecklist(flags);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  printUsage();
  process.exit(1);
}
