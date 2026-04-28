import { execFileSync, spawnSync } from "node:child_process";

const BLOCKED_STAGE_PATH_PREFIXES = ["tmp/", "snapshots/"];
const DEFAULT_GIT_SHOW_MAX_BUFFER = 20 * 1024 * 1024;
const GIT_SHOW_BUFFER_HEADROOM = 1024 * 1024;

const SECRET_PATTERNS = [
  {
    label: "Supabase secret key",
    regex: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    label: "AWS access key id",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    label: "Private key block",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  },
  {
    label: "OpenAI API key",
    regex: /\bsk-[A-Za-z0-9]{20,}\b/g,
  },
  {
    label: "Supabase service role assignment",
    regex:
      /\b(?:INGEST_SUPABASE_SERVICE_ROLE_KEY|APP_SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY)\s*=\s*([^\s]+)/g,
  },
];

const parseArgs = (argv) => {
  const args = argv.slice(2);
  let hook = "manual";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--hook") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --hook");
      }
      hook = value;
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      return { help: true, hook };
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { help: false, hook };
};

const usage = () => {
  console.log("Git preflight checks");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/git-preflight.mjs [--hook pre-commit|pre-push]");
};

const runGit = (args, options = {}) => {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    ...options,
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() ?? "";
    const stdout = result.stdout?.trim() ?? "";
    throw new Error(stderr || stdout || `git ${args.join(" ")} failed`);
  }

  return result.stdout ?? "";
};

const getStagedFiles = () => {
  const raw = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB", "-z"],
    { cwd: process.cwd() }
  );

  return raw
    .toString("utf8")
    .split("\0")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const isProbablyTextBuffer = (buffer) => {
  const sample = buffer.subarray(0, Math.min(buffer.length, 2048));
  return !sample.includes(0);
};

const toLineNumber = (text, index) => {
  if (index <= 0) {
    return 1;
  }
  return text.slice(0, index).split("\n").length;
};

const shouldIgnoreServiceRoleValue = (rawValue) => {
  const cleaned = rawValue.replace(/^['\"]|['\"]$/g, "").trim();
  if (cleaned.length === 0) return true;

  const normalized = cleaned.toLowerCase();
  if (normalized.includes("env(")) return true;
  if (normalized.includes("example")) return true;
  if (normalized.includes("placeholder")) return true;
  if (normalized.includes("your_")) return true;
  if (cleaned.startsWith("<") && cleaned.endsWith(">")) return true;

  return false;
};

const mask = (value) => {
  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return "***";
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
};

const isSubmodulePath = (file) => {
  const output = execFileSync("git", ["ls-files", "--stage", "--", file], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();

  if (output.length === 0) {
    return false;
  }

  const [mode] = output.split(/\s+/, 2);
  return mode === "160000";
};

const getStagedBlobSize = (file) => {
  const raw = execFileSync("git", ["cat-file", "-s", `:${file}`], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();

  const size = Number.parseInt(raw, 10);
  if (!Number.isFinite(size) || size < 0) {
    throw new Error(`Unable to determine staged blob size for ${file}`);
  }

  return size;
};

const scanForSecrets = (stagedFiles) => {
  const findings = [];

  for (const file of stagedFiles) {
    if (isSubmodulePath(file)) {
      continue;
    }

    const stagedBlobSize = getStagedBlobSize(file);
    const contentBuffer = execFileSync("git", ["show", `:${file}`], {
      cwd: process.cwd(),
      maxBuffer: Math.max(
        DEFAULT_GIT_SHOW_MAX_BUFFER,
        stagedBlobSize + GIT_SHOW_BUFFER_HEADROOM
      ),
    });

    if (!isProbablyTextBuffer(contentBuffer)) {
      continue;
    }

    const text = contentBuffer.toString("utf8");

    for (const pattern of SECRET_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const matchedValue = match[0] ?? "";

        if (pattern.label === "Supabase service role assignment") {
          const rawValue = match[1] ?? "";
          if (shouldIgnoreServiceRoleValue(rawValue)) {
            continue;
          }
        }

        findings.push({
          file,
          line: toLineNumber(text, match.index),
          label: pattern.label,
          match: mask(matchedValue),
        });

        if (findings.length >= 50) {
          return findings;
        }
      }
    }
  }

  return findings;
};

const checkBlockedPaths = (stagedFiles) => {
  const blocked = stagedFiles.filter((file) =>
    BLOCKED_STAGE_PATH_PREFIXES.some((prefix) => file.startsWith(prefix))
  );

  if (blocked.length === 0) {
    return;
  }

  const lines = blocked.map((file) => `- ${file}`).join("\n");
  throw new Error(
    `Blocked generated artifact paths are staged:\n${lines}\n\nRemove them from staging before commit.`
  );
};

const tryRunGitleaks = () => {
  const version = spawnSync("gitleaks", ["version"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (version.error || version.status !== 0) {
    return { status: "missing" };
  }

  const attempts = [
    ["protect", "--staged", "--redact", "--no-banner"],
    ["protect", "--staged", "--redact"],
  ];

  for (const args of attempts) {
    const result = spawnSync("gitleaks", args, {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

    if (result.status === 0) {
      return { status: "ok", command: `gitleaks ${args.join(" ")}` };
    }

    if (
      output.includes("unknown command") ||
      output.includes("flag provided but not defined") ||
      output.includes("unknown shorthand flag")
    ) {
      continue;
    }

    throw new Error(
      `gitleaks detected issues or failed.\nCommand: gitleaks ${args.join(" ")}\n${output.trim()}`
    );
  }

  return { status: "unsupported" };
};

const main = () => {
  const { help, hook } = parseArgs(process.argv);
  if (help) {
    usage();
    return;
  }

  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    console.log(`[git-preflight:${hook}] No staged files.`);
    return;
  }

  checkBlockedPaths(stagedFiles);

  const findings = scanForSecrets(stagedFiles);
  if (findings.length > 0) {
    const rows = findings
      .map(
        (finding) =>
          `- ${finding.file}:${finding.line} [${finding.label}] ${finding.match}`
      )
      .join("\n");

    throw new Error(`Potential secrets detected in staged content:\n${rows}`);
  }

  const gitleaksResult = tryRunGitleaks();
  if (gitleaksResult.status === "ok") {
    console.log(`[git-preflight:${hook}] OK (${gitleaksResult.command}).`);
  } else if (gitleaksResult.status === "unsupported") {
    console.log(
      `[git-preflight:${hook}] OK (gitleaks installed but unsupported CLI form; used internal scanner).`
    );
  } else {
    console.log(
      `[git-preflight:${hook}] OK (internal scanner). Install gitleaks for deeper staged checks.`
    );
  }
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[git-preflight] ${message}`);
  process.exit(1);
}
