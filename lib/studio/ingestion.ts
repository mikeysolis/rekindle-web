import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/database/server";
import { createIngestionServiceRoleClient } from "@/lib/ingestion/client";

export const INGEST_CANDIDATE_STATUSES = [
  "new",
  "normalized",
  "curated",
  "pushed_to_studio",
  "exported",
  "rejected",
] as const;

export type IngestCandidateStatus = (typeof INGEST_CANDIDATE_STATUSES)[number];

export type IngestionConfidenceBand = "high" | "medium" | "low" | "unknown";
export type IngestionConfidenceFilter = "all" | IngestionConfidenceBand;
export type IngestionDuplicateRisk = "likely" | "low";
export type IngestionDuplicateRiskFilter = "all" | IngestionDuplicateRisk;
export type IngestionRewriteSeverity = "light" | "moderate" | "heavy";
export type IngestionEditorLabelAction =
  | "promoted"
  | "promoted_after_edit"
  | "rejected"
  | "needs_work";

export const INGEST_REWRITE_SEVERITY_OPTIONS: readonly IngestionRewriteSeverity[] = [
  "light",
  "moderate",
  "heavy",
] as const;

export const INGEST_REJECTION_REASON_CODES = [
  "not_actionable",
  "too_vague_or_generic",
  "duplicate_existing_idea",
  "safety_or_harm_risk",
  "policy_or_compliance_risk",
  "off_topic_for_rekindle",
  "low_content_quality",
  "extraction_error_or_incomplete",
  "paywalled_or_missing_context",
] as const;

export type IngestionRejectionReasonCode = (typeof INGEST_REJECTION_REASON_CODES)[number];

export const INGEST_REJECTION_REASON_OPTIONS: Array<{
  code: IngestionRejectionReasonCode;
  label: string;
  description: string;
}> = [
  {
    code: "not_actionable",
    label: "Not actionable",
    description: "Does not contain a clear action the user can take.",
  },
  {
    code: "too_vague_or_generic",
    label: "Too vague",
    description: "Idea is too generic to be useful without major interpretation.",
  },
  {
    code: "duplicate_existing_idea",
    label: "Duplicate idea",
    description: "Substantially duplicates an existing candidate or draft.",
  },
  {
    code: "safety_or_harm_risk",
    label: "Safety risk",
    description: "Could cause physical, emotional, or relational harm.",
  },
  {
    code: "policy_or_compliance_risk",
    label: "Policy risk",
    description: "Violates legal/compliance or source usage constraints.",
  },
  {
    code: "off_topic_for_rekindle",
    label: "Off-topic",
    description: "Does not fit Rekindle product purpose or audience.",
  },
  {
    code: "low_content_quality",
    label: "Low quality",
    description: "Content quality is weak (spammy, incoherent, or low signal).",
  },
  {
    code: "extraction_error_or_incomplete",
    label: "Extraction error",
    description: "Parser captured broken/incomplete text, making the idea unusable.",
  },
  {
    code: "paywalled_or_missing_context",
    label: "Missing context",
    description: "Source requires unavailable context/paywall to validate usefulness.",
  },
];

export type IngestionCandidate = {
  id: string;
  runId: string;
  pageId: string | null;
  sourceKey: string;
  sourceUrl: string;
  title: string;
  description: string | null;
  reasonSnippet: string | null;
  rawExcerpt: string | null;
  candidateKey: string;
  status: IngestCandidateStatus;
  metaJson: Record<string, unknown>;
  qualityScore: number | null;
  qualityThreshold: number | null;
  qualityPassed: boolean | null;
  qualityFlags: string[];
  confidenceBand: IngestionConfidenceBand;
  duplicateRisk: IngestionDuplicateRisk;
  createdAt: string | null;
  updatedAt: string | null;
};

export type IngestionCandidateTrait = {
  id: string;
  candidateId: string;
  traitTypeSlug: string;
  traitOptionSlug: string;
  confidence: number | null;
  source: string | null;
  createdAt: string | null;
};

export type IngestionSyncLogEntry = {
  id: string;
  candidateId: string;
  targetSystem: string;
  targetId: string | null;
  status: "pending" | "success" | "failed";
  syncedAt: string | null;
  errorText: string | null;
};

export type IngestionCandidateDetail = {
  candidate: IngestionCandidate;
  traits: IngestionCandidateTrait[];
  syncLog: IngestionSyncLogEntry[];
  duplicateHints: IngestionDuplicateHint[];
};

export type IngestionDuplicateHint = {
  candidateId: string;
  promotedDraftId: string | null;
  sourceUrl: string;
  title: string;
  status: IngestCandidateStatus;
  similarityScore: number;
  reasons: string[];
  updatedAt: string | null;
};

export type IngestionListFilters = {
  status?: IngestCandidateStatus | "all";
  sourceKey?: string;
  query?: string;
  confidence?: IngestionConfidenceFilter;
  duplicateRisk?: IngestionDuplicateRiskFilter;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};

export type IngestionPortfolioWindowDays = 7 | 30 | 90;

export type IngestionSourcePortfolioRow = {
  sourceKey: string;
  displayName: string;
  state: string;
  approvedForProd: boolean;
  inboxedCandidates: number;
  reviewedCandidates: number;
  acceptedIdeas: number;
  acceptedIdeasLast7d: number;
  precisionProxy: number | null;
  freshnessContribution: number | null;
  diversityUnits: number;
  diversityContribution: number | null;
  diversityMethod: "traits" | "title_uniques";
  runCount: number;
  partialRuns: number;
  failedRuns: number;
  maintenanceFailureRate: number | null;
  failedPages: number;
  lastCandidateAt: string | null;
  lastAcceptedAt: string | null;
};

export type IngestionSourcePortfolioSummary = {
  generatedAt: string;
  windowDays: IngestionPortfolioWindowDays;
  windowStartAt: string;
  totalSources: number;
  activeSources: number;
  totalInboxedCandidates: number;
  totalReviewedCandidates: number;
  totalAcceptedIdeas: number;
  totalAcceptedIdeasLast7d: number;
  diversityMethod: "traits" | "title_uniques";
  totalDiversityUnits: number;
};

export type IngestionSourcePortfolioMetrics = {
  summary: IngestionSourcePortfolioSummary;
  rows: IngestionSourcePortfolioRow[];
};

export type IngestionLabelTrendRejectReason = {
  code: string;
  count: number;
  share: number | null;
};

export type IngestionLabelTrendRow = {
  windowDays: IngestionPortfolioWindowDays;
  windowStartAt: string;
  reviewedLabels: number;
  promotedLabels: number;
  promotedAfterEditLabels: number;
  rejectedLabels: number;
  needsWorkLabels: number;
  promotionRate: number | null;
  rejectionRate: number | null;
  duplicateConfirmedRate: number | null;
  heavyRewriteShare: number | null;
  topRejectReasons: IngestionLabelTrendRejectReason[];
};

export type IngestionLabelSourceKpiRow = {
  sourceKey: string;
  displayName: string;
  state: string;
  approvedForProd: boolean;
  reviewedLabels: number;
  promotedLabels: number;
  rejectedLabels: number;
  needsWorkLabels: number;
  promotionRate: number | null;
  rejectionRate: number | null;
  duplicateConfirmedRate: number | null;
  heavyRewriteShare: number | null;
  topRejectReasonCode: string | null;
  strategyCount: number;
};

export type IngestionLabelStrategyKpiRow = {
  strategy: string;
  reviewedLabels: number;
  promotedLabels: number;
  rejectedLabels: number;
  needsWorkLabels: number;
  promotionRate: number | null;
  rejectionRate: number | null;
  duplicateConfirmedRate: number | null;
  heavyRewriteShare: number | null;
  topRejectReasonCode: string | null;
  sourceCount: number;
};

export type IngestionLabelQualityAnalytics = {
  generatedAt: string;
  selectedWindowDays: IngestionPortfolioWindowDays;
  selectedWindowStartAt: string;
  trendRows: IngestionLabelTrendRow[];
  sourceRows: IngestionLabelSourceKpiRow[];
  strategyRows: IngestionLabelStrategyKpiRow[];
};

export type IngestionSourceLifecycleState =
  | "proposed"
  | "approved_for_trial"
  | "active"
  | "degraded"
  | "paused"
  | "retired";

export type ReactivateIngestionSourceInput = {
  sourceKey: string;
  actorUserId: string;
  reason: string;
  productOwnerApproved: boolean;
  complianceAcknowledged: boolean;
};

export type RetireIngestionSourceInput = {
  sourceKey: string;
  actorUserId: string;
  reason: string;
  productOwnerApproved: boolean;
  complianceAcknowledged: boolean;
  archivalReference: string | null;
  archivalSummary: string | null;
};

export type PromoteIngestionCandidateResult = {
  draftId: string;
  created: boolean;
  warnings: string[];
};

type RawCandidateRow = {
  id: string;
  run_id: string;
  page_id: string | null;
  source_key: string;
  source_url: string;
  title: string;
  description: string | null;
  reason_snippet: string | null;
  raw_excerpt: string | null;
  candidate_key: string;
  status: string | null;
  meta_json: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type RawTraitRow = {
  id: string;
  candidate_id: string;
  trait_type_slug: string;
  trait_option_slug: string;
  confidence: number | null;
  source: string | null;
  created_at: string | null;
};

type RawSyncLogRow = {
  id: string;
  candidate_id: string;
  target_system: string;
  target_id: string | null;
  status: "pending" | "success" | "failed";
  synced_at: string | null;
  error_text: string | null;
};

type RawDuplicateHintRow = {
  id: string;
  source_url: string;
  title: string;
  candidate_key: string;
  status: string | null;
  updated_at: string | null;
};

type RawDuplicateSyncRow = {
  candidate_id: string;
  target_id: string | null;
  synced_at: string | null;
};

type RawSourceRegistryPortfolioRow = {
  source_key: string;
  display_name: string;
  state: string;
  approved_for_prod: boolean;
};

type RawPortfolioCandidateActivityRow = {
  id: string;
  source_key: string;
  title: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type RawPortfolioRunRow = {
  source_key: string;
  status: string | null;
  meta_json: unknown;
  started_at: string | null;
};

type RawPortfolioTraitRow = {
  candidate_id: string;
  trait_type_slug: string;
  trait_option_slug: string;
};

type RawSourceLifecycleRow = {
  source_key: string;
  state: string;
  approved_for_prod: boolean;
  config_version: string;
  metadata_json: unknown;
};

type RawEditorLabelRow = {
  candidate_id: string;
  action: string;
  reject_reason_code: string | null;
  rewrite_severity: string | null;
  duplicate_confirmed: boolean | null;
  actor_user_id: string;
  created_at: string | null;
};

type RawLabelCandidateProjectionRow = {
  id: string;
  source_key: string;
  meta_json: unknown;
};

type RawSourceRegistryQualityRow = {
  source_key: string;
  display_name: string;
  state: string;
  approved_for_prod: boolean;
};

type IngestionLabelFact = {
  createdAt: string;
  action: IngestionEditorLabelAction;
  rejectReasonCode: string | null;
  rewriteSeverity: IngestionRewriteSeverity | null;
  duplicateConfirmed: boolean | null;
  sourceKey: string;
  sourceDisplayName: string;
  sourceState: string;
  sourceApprovedForProd: boolean;
  strategy: string;
};

function parseCandidateStatus(value: string | null): IngestCandidateStatus {
  if (!value) {
    return "new";
  }

  if (
    value === "new" ||
    value === "normalized" ||
    value === "curated" ||
    value === "pushed_to_studio" ||
    value === "exported" ||
    value === "rejected"
  ) {
    return value;
  }

  return "new";
}

const SOURCE_LIFECYCLE_STATES: IngestionSourceLifecycleState[] = [
  "proposed",
  "approved_for_trial",
  "active",
  "degraded",
  "paused",
  "retired",
];

const REACTIVATABLE_SOURCE_STATE_SET = new Set<IngestionSourceLifecycleState>([
  "paused",
  "degraded",
]);
const RETIRABLE_SOURCE_STATE_SET = new Set<IngestionSourceLifecycleState>([
  "active",
  "degraded",
  "paused",
]);
const EDITOR_LABEL_ACTION_SET = new Set<IngestionEditorLabelAction>([
  "promoted",
  "promoted_after_edit",
  "rejected",
  "needs_work",
]);
const REWRITE_SEVERITY_SET = new Set<IngestionRewriteSeverity>(INGEST_REWRITE_SEVERITY_OPTIONS);
const REJECTION_REASON_SET = new Set<IngestionRejectionReasonCode>(INGEST_REJECTION_REASON_CODES);
const LABEL_TREND_WINDOWS: IngestionPortfolioWindowDays[] = [7, 30, 90];
const LIFECYCLE_WORKFLOW_VERSION = "ing033_v1";

function parseSourceLifecycleState(
  value: string | null | undefined,
): IngestionSourceLifecycleState | null {
  if (!value) {
    return null;
  }

  if (SOURCE_LIFECYCLE_STATES.includes(value as IngestionSourceLifecycleState)) {
    return value as IngestionSourceLifecycleState;
  }

  return null;
}

export function canReactivateIngestionSourceState(state: string): boolean {
  const parsed = parseSourceLifecycleState(state);
  return parsed ? REACTIVATABLE_SOURCE_STATE_SET.has(parsed) : false;
}

export function canRetireIngestionSourceState(state: string): boolean {
  const parsed = parseSourceLifecycleState(state);
  return parsed ? RETIRABLE_SOURCE_STATE_SET.has(parsed) : false;
}

function parseEditorLabelAction(value: string | null | undefined): IngestionEditorLabelAction | null {
  if (!value) {
    return null;
  }

  if (EDITOR_LABEL_ACTION_SET.has(value as IngestionEditorLabelAction)) {
    return value as IngestionEditorLabelAction;
  }

  return null;
}

function parseRewriteSeverity(value: string | null | undefined): IngestionRewriteSeverity | null {
  if (!value) {
    return null;
  }

  if (REWRITE_SEVERITY_SET.has(value as IngestionRewriteSeverity)) {
    return value as IngestionRewriteSeverity;
  }

  return null;
}

function readCandidateExtractionStrategy(metaJson: unknown): string {
  const meta = toMetaJson(metaJson);
  const strategy = meta.extraction_strategy;
  if (typeof strategy === "string" && strategy.trim().length > 0) {
    return strategy.trim();
  }
  return "unknown";
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

function normalizeRewriteSeverity(
  value: string,
  label = "Rewrite severity",
): IngestionRewriteSeverity {
  const trimmed = value.trim();
  if (!REWRITE_SEVERITY_SET.has(trimmed as IngestionRewriteSeverity)) {
    throw new Error(`${label} must be one of: light, moderate, heavy.`);
  }
  return trimmed as IngestionRewriteSeverity;
}

function normalizeRejectReasonCode(value: string): IngestionRejectionReasonCode {
  const trimmed = value.trim();
  if (!REJECTION_REASON_SET.has(trimmed as IngestionRejectionReasonCode)) {
    throw new Error("Reject reason code is required and must use the standard taxonomy.");
  }
  return trimmed as IngestionRejectionReasonCode;
}

function toMetaJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({ ...(item as Record<string, unknown>) }));
}

function appendBoundedHistory(
  existingValue: unknown,
  entry: Record<string, unknown>,
  maxEntries = 20,
): Record<string, unknown>[] {
  return [...toObjectArray(existingValue), entry].slice(-maxEntries);
}

function normalizeRequiredReason(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nextSourceConfigVersion(currentVersion: string, nowIso: string): string {
  const trimmed = currentVersion.trim();
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isFinite(parsed) && String(parsed) === trimmed) {
    return String(parsed + 1);
  }

  const stamp = nowIso.replace(/[-:.TZ]/g, "").slice(0, 14);
  const base = trimmed.length > 0 ? trimmed : "1";
  return `${base}-auto-${stamp}`;
}

function parseFailedPagesFromRunMeta(value: unknown): number {
  const meta = toMetaJson(value);
  const failedPages = toFiniteNumber(meta.failed_pages);
  if (failedPages === null) {
    return 0;
  }

  return Math.max(0, Math.round(failedPages));
}

function normalizeTitleSignature(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function maxIsoDatetime(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;

  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) {
    return left;
  }

  return rightMs > leftMs ? right : left;
}

function coercePortfolioWindowDays(value: number): IngestionPortfolioWindowDays {
  if (value <= 7) {
    return 7;
  }

  if (value <= 30) {
    return 30;
  }

  return 90;
}

async function readPagedRows<T>(params: {
  label: string;
  fetchPage: (from: number, to: number) => Promise<{
    data: T[] | null;
    error: { message: string } | null;
  }>;
  batchSize?: number;
}): Promise<T[]> {
  const batchSize = params.batchSize ?? 1000;
  const output: T[] = [];
  let from = 0;

  while (true) {
    const to = from + batchSize - 1;
    const { data, error } = await params.fetchPage(from, to);

    if (error) {
      throw new Error(`Failed to load ${params.label}: ${error.message}`);
    }

    const rows = (data ?? []) as T[];
    output.push(...rows);

    if (rows.length < batchSize) {
      break;
    }

    from += batchSize;
  }

  return output;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) {
    return [];
  }

  const output: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    output.push(items.slice(index, index + chunkSize));
  }
  return output;
}

type IngestionLabelAggregate = {
  reviewedLabels: number;
  promotedLabels: number;
  promotedAfterEditLabels: number;
  rejectedLabels: number;
  needsWorkLabels: number;
  duplicateKnownLabels: number;
  duplicateConfirmedLabels: number;
  rewriteKnownLabels: number;
  heavyRewriteLabels: number;
  rejectReasonCounts: Map<string, number>;
};

function createEmptyLabelAggregate(): IngestionLabelAggregate {
  return {
    reviewedLabels: 0,
    promotedLabels: 0,
    promotedAfterEditLabels: 0,
    rejectedLabels: 0,
    needsWorkLabels: 0,
    duplicateKnownLabels: 0,
    duplicateConfirmedLabels: 0,
    rewriteKnownLabels: 0,
    heavyRewriteLabels: 0,
    rejectReasonCounts: new Map<string, number>(),
  };
}

function aggregateIngestionLabelFacts(rows: IngestionLabelFact[]): IngestionLabelAggregate {
  const aggregate = createEmptyLabelAggregate();

  for (const row of rows) {
    aggregate.reviewedLabels += 1;

    if (row.action === "promoted") {
      aggregate.promotedLabels += 1;
    } else if (row.action === "promoted_after_edit") {
      aggregate.promotedAfterEditLabels += 1;
    } else if (row.action === "rejected") {
      aggregate.rejectedLabels += 1;
    } else if (row.action === "needs_work") {
      aggregate.needsWorkLabels += 1;
    }

    if (row.duplicateConfirmed !== null) {
      aggregate.duplicateKnownLabels += 1;
      if (row.duplicateConfirmed) {
        aggregate.duplicateConfirmedLabels += 1;
      }
    }

    if (row.rewriteSeverity !== null) {
      aggregate.rewriteKnownLabels += 1;
      if (row.rewriteSeverity === "heavy") {
        aggregate.heavyRewriteLabels += 1;
      }
    }

    if (row.action === "rejected" && row.rejectReasonCode) {
      aggregate.rejectReasonCounts.set(
        row.rejectReasonCode,
        (aggregate.rejectReasonCounts.get(row.rejectReasonCode) ?? 0) + 1,
      );
    }
  }

  return aggregate;
}

function toTopRejectReasons(
  counts: Map<string, number>,
  rejectedLabels: number,
): IngestionLabelTrendRejectReason[] {
  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, 3)
    .map(([code, count]) => ({
      code,
      count,
      share: safeRatio(count, rejectedLabels),
    }));
}

function topRejectReasonCode(counts: Map<string, number>): string | null {
  const top = Array.from(counts.entries()).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    return left[0].localeCompare(right[0]);
  })[0];
  return top ? top[0] : null;
}

function computeWindowStartIso(windowDays: IngestionPortfolioWindowDays): string {
  return new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
}

function buildLabelTrendRow(params: {
  windowDays: IngestionPortfolioWindowDays;
  rows: IngestionLabelFact[];
}): IngestionLabelTrendRow {
  const windowStartAt = computeWindowStartIso(params.windowDays);
  const windowStartMs = Date.parse(windowStartAt);
  const filteredRows = params.rows.filter((row) => Date.parse(row.createdAt) >= windowStartMs);
  const aggregate = aggregateIngestionLabelFacts(filteredRows);
  const promotedTotal = aggregate.promotedLabels + aggregate.promotedAfterEditLabels;

  return {
    windowDays: params.windowDays,
    windowStartAt,
    reviewedLabels: aggregate.reviewedLabels,
    promotedLabels: aggregate.promotedLabels,
    promotedAfterEditLabels: aggregate.promotedAfterEditLabels,
    rejectedLabels: aggregate.rejectedLabels,
    needsWorkLabels: aggregate.needsWorkLabels,
    promotionRate: safeRatio(promotedTotal, aggregate.reviewedLabels),
    rejectionRate: safeRatio(aggregate.rejectedLabels, aggregate.reviewedLabels),
    duplicateConfirmedRate: safeRatio(
      aggregate.duplicateConfirmedLabels,
      aggregate.duplicateKnownLabels,
    ),
    heavyRewriteShare: safeRatio(aggregate.heavyRewriteLabels, aggregate.rewriteKnownLabels),
    topRejectReasons: toTopRejectReasons(aggregate.rejectReasonCounts, aggregate.rejectedLabels),
  };
}

function readQualityMeta(metaJson: Record<string, unknown>): {
  score: number | null;
  threshold: number | null;
  passed: boolean | null;
  flags: string[];
} {
  const value = metaJson.quality;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      score: null,
      threshold: null,
      passed: null,
      flags: [],
    };
  }

  const quality = value as Record<string, unknown>;
  const score = typeof quality.score === "number" ? quality.score : null;
  const threshold = typeof quality.threshold === "number" ? quality.threshold : null;
  const passed = typeof quality.passed === "boolean" ? quality.passed : null;
  const flags = Array.isArray(quality.flags)
    ? quality.flags.map((entry) => String(entry))
    : [];

  return {
    score,
    threshold,
    passed,
    flags,
  };
}

function classifyConfidenceBand(score: number | null): IngestionConfidenceBand {
  if (score === null) {
    return "unknown";
  }

  if (score >= 0.85) {
    return "high";
  }

  if (score >= 0.6) {
    return "medium";
  }

  return "low";
}

function classifyDuplicateRisk(
  metaJson: Record<string, unknown>,
  qualityFlags: string[],
): IngestionDuplicateRisk {
  const duplicateSignalInMeta = metaJson.duplicate_candidate_key_existing === true;
  const duplicateSignalInFlags = qualityFlags.includes("duplicate_candidate_key_existing");
  if (duplicateSignalInMeta || duplicateSignalInFlags) {
    return "likely";
  }

  return "low";
}

function isDateFilterValue(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toUtcDateRange(date: string, edge: "start" | "end"): string {
  return edge === "start" ? `${date}T00:00:00.000Z` : `${date}T23:59:59.999Z`;
}

function mapCandidate(row: RawCandidateRow): IngestionCandidate {
  const metaJson = toMetaJson(row.meta_json);
  const quality = readQualityMeta(metaJson);

  return {
    id: row.id,
    runId: row.run_id,
    pageId: row.page_id,
    sourceKey: row.source_key,
    sourceUrl: row.source_url,
    title: row.title,
    description: row.description,
    reasonSnippet: row.reason_snippet,
    rawExcerpt: row.raw_excerpt,
    candidateKey: row.candidate_key,
    status: parseCandidateStatus(row.status),
    metaJson,
    qualityScore: quality.score,
    qualityThreshold: quality.threshold,
    qualityPassed: quality.passed,
    qualityFlags: quality.flags,
    confidenceBand: classifyConfidenceBand(quality.score),
    duplicateRisk: classifyDuplicateRisk(metaJson, quality.flags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrait(row: RawTraitRow): IngestionCandidateTrait {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    traitTypeSlug: row.trait_type_slug,
    traitOptionSlug: row.trait_option_slug,
    confidence: row.confidence,
    source: row.source,
    createdAt: row.created_at,
  };
}

function mapSyncLog(row: RawSyncLogRow): IngestionSyncLogEntry {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    targetSystem: row.target_system,
    targetId: row.target_id,
    status: row.status,
    syncedAt: row.synced_at,
    errorText: row.error_text,
  };
}

function normalizeForSimilarity(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenizeForSimilarity(value: string): string[] {
  return normalizeForSimilarity(value).split(" ").filter(Boolean);
}

function jaccardSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let intersectionCount = 0;

  for (const value of leftSet) {
    if (rightSet.has(value)) {
      intersectionCount += 1;
    }
  }

  const unionCount = new Set([...leftSet, ...rightSet]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

function normalizeComparableUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname =
      parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
        ? parsed.pathname.slice(0, -1)
        : parsed.pathname;
    return parsed.toString();
  } catch {
    return url;
  }
}

function computeDuplicateHints(params: {
  candidate: IngestionCandidate;
  rows: RawDuplicateHintRow[];
}): IngestionDuplicateHint[] {
  const sourceUrl = normalizeComparableUrl(params.candidate.sourceUrl);
  const candidateKey = params.candidate.candidateKey;
  const baseTitleTokens = tokenizeForSimilarity(params.candidate.title);

  const scored: IngestionDuplicateHint[] = [];
  for (const row of params.rows) {
    const reasons: string[] = [];
    let score = 0;

    if (row.candidate_key === candidateKey) {
      reasons.push("same_candidate_key");
      score = Math.max(score, 1);
    }

    if (normalizeComparableUrl(row.source_url) === sourceUrl) {
      reasons.push("same_source_url");
      score = Math.max(score, 0.98);
    }

    const titleSimilarity = jaccardSimilarity(baseTitleTokens, tokenizeForSimilarity(row.title));
    if (titleSimilarity >= 0.7) {
      reasons.push("high_title_similarity");
      score = Math.max(score, titleSimilarity);
    }

    if (reasons.length === 0 && titleSimilarity < 0.66) {
      continue;
    }

    scored.push({
      candidateId: row.id,
      promotedDraftId: null,
      sourceUrl: row.source_url,
      title: row.title,
      status: parseCandidateStatus(row.status),
      similarityScore: Number(score.toFixed(4)),
      reasons,
      updatedAt: row.updated_at,
    });
  }

  return scored.sort((left, right) => right.similarityScore - left.similarityScore).slice(0, 5);
}

const REVIEWED_PORTFOLIO_STATUSES: IngestCandidateStatus[] = [
  "rejected",
  "pushed_to_studio",
  "exported",
];

const ACCEPTED_PORTFOLIO_STATUS_SET = new Set<IngestCandidateStatus>([
  "pushed_to_studio",
  "exported",
]);

type WorkingSourcePortfolioRow = {
  sourceKey: string;
  displayName: string;
  state: string;
  approvedForProd: boolean;
  inboxedCandidates: number;
  reviewedCandidates: number;
  acceptedIdeas: number;
  acceptedIdeasLast7d: number;
  runCount: number;
  partialRuns: number;
  failedRuns: number;
  failedPages: number;
  lastCandidateAt: string | null;
  lastAcceptedAt: string | null;
  acceptedCandidateIds: Set<string>;
  acceptedTitleSignatures: Set<string>;
  traitUnits: Set<string>;
};

function createWorkingSourcePortfolioRow(params: {
  sourceKey: string;
  displayName?: string;
  state?: string;
  approvedForProd?: boolean;
}): WorkingSourcePortfolioRow {
  return {
    sourceKey: params.sourceKey,
    displayName: params.displayName ?? params.sourceKey,
    state: params.state ?? "unregistered",
    approvedForProd: params.approvedForProd ?? false,
    inboxedCandidates: 0,
    reviewedCandidates: 0,
    acceptedIdeas: 0,
    acceptedIdeasLast7d: 0,
    runCount: 0,
    partialRuns: 0,
    failedRuns: 0,
    failedPages: 0,
    lastCandidateAt: null,
    lastAcceptedAt: null,
    acceptedCandidateIds: new Set<string>(),
    acceptedTitleSignatures: new Set<string>(),
    traitUnits: new Set<string>(),
  };
}

export async function listIngestionSourcePortfolioMetrics(
  requestedWindowDays = 30,
): Promise<IngestionSourcePortfolioMetrics> {
  const ingest = createIngestionServiceRoleClient();
  const windowDays = coercePortfolioWindowDays(requestedWindowDays);
  const generatedAt = new Date().toISOString();
  const windowStartAt = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const freshnessStartAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const freshnessStartMs = Date.parse(freshnessStartAt);

  const [sourceRegistryRows, createdRows, decisionRows, runRows] = await Promise.all([
    readPagedRows<RawSourceRegistryPortfolioRow>({
      label: "source registry portfolio rows",
      fetchPage: (from, to) =>
        ingest
          .from("ingest_source_registry")
          .select("source_key, display_name, state, approved_for_prod")
          .order("source_key", { ascending: true })
          .range(from, to) as unknown as Promise<{
          data: RawSourceRegistryPortfolioRow[] | null;
          error: { message: string } | null;
        }>,
    }),
    readPagedRows<RawPortfolioCandidateActivityRow>({
      label: "candidate inbox rows",
      fetchPage: (from, to) =>
        ingest
          .from("ingest_candidates")
          .select("id, source_key, title, status, created_at, updated_at")
          .gte("created_at", windowStartAt)
          .order("created_at", { ascending: false })
          .range(from, to) as unknown as Promise<{
          data: RawPortfolioCandidateActivityRow[] | null;
          error: { message: string } | null;
        }>,
    }),
    readPagedRows<RawPortfolioCandidateActivityRow>({
      label: "candidate decision rows",
      fetchPage: (from, to) =>
        ingest
          .from("ingest_candidates")
          .select("id, source_key, title, status, created_at, updated_at")
          .in("status", REVIEWED_PORTFOLIO_STATUSES)
          .gte("updated_at", windowStartAt)
          .order("updated_at", { ascending: false })
          .range(from, to) as unknown as Promise<{
          data: RawPortfolioCandidateActivityRow[] | null;
          error: { message: string } | null;
        }>,
    }),
    readPagedRows<RawPortfolioRunRow>({
      label: "run reliability rows",
      fetchPage: (from, to) =>
        ingest
          .from("ingest_runs")
          .select("source_key, status, meta_json, started_at")
          .gte("started_at", windowStartAt)
          .order("started_at", { ascending: false })
          .range(from, to) as unknown as Promise<{
          data: RawPortfolioRunRow[] | null;
          error: { message: string } | null;
        }>,
    }),
  ]);

  const sourceKeySet = new Set<string>();
  for (const row of sourceRegistryRows) {
    sourceKeySet.add(row.source_key);
  }
  for (const row of createdRows) {
    sourceKeySet.add(row.source_key);
  }
  for (const row of decisionRows) {
    sourceKeySet.add(row.source_key);
  }
  for (const row of runRows) {
    sourceKeySet.add(row.source_key);
  }

  const sourceMap = new Map<string, WorkingSourcePortfolioRow>();

  const ensureSource = (sourceKey: string): WorkingSourcePortfolioRow => {
    const existing = sourceMap.get(sourceKey);
    if (existing) {
      return existing;
    }

    const next = createWorkingSourcePortfolioRow({ sourceKey });
    sourceMap.set(sourceKey, next);
    return next;
  };

  for (const sourceKey of sourceKeySet) {
    ensureSource(sourceKey);
  }

  for (const row of sourceRegistryRows) {
    sourceMap.set(
      row.source_key,
      createWorkingSourcePortfolioRow({
        sourceKey: row.source_key,
        displayName: row.display_name,
        state: row.state,
        approvedForProd: row.approved_for_prod,
      }),
    );
  }

  for (const row of createdRows) {
    const source = ensureSource(row.source_key);
    source.inboxedCandidates += 1;
    source.lastCandidateAt = maxIsoDatetime(source.lastCandidateAt, row.created_at);
  }

  const acceptedSourceByCandidateId = new Map<string, string>();
  for (const row of decisionRows) {
    const source = ensureSource(row.source_key);
    const status = parseCandidateStatus(row.status);
    source.reviewedCandidates += 1;

    if (!ACCEPTED_PORTFOLIO_STATUS_SET.has(status)) {
      continue;
    }

    source.acceptedIdeas += 1;
    source.lastAcceptedAt = maxIsoDatetime(source.lastAcceptedAt, row.updated_at);
    source.acceptedCandidateIds.add(row.id);

    const normalizedTitle = normalizeTitleSignature(row.title);
    if (normalizedTitle) {
      source.acceptedTitleSignatures.add(normalizedTitle);
    }

    const updatedAtMs = row.updated_at ? Date.parse(row.updated_at) : Number.NaN;
    if (Number.isFinite(updatedAtMs) && updatedAtMs >= freshnessStartMs) {
      source.acceptedIdeasLast7d += 1;
    }

    acceptedSourceByCandidateId.set(row.id, row.source_key);
  }

  for (const row of runRows) {
    const source = ensureSource(row.source_key);
    source.runCount += 1;
    source.failedPages += parseFailedPagesFromRunMeta(row.meta_json);

    if (row.status === "failed") {
      source.failedRuns += 1;
      continue;
    }

    if (row.status === "partial") {
      source.partialRuns += 1;
    }
  }

  const acceptedCandidateIds = Array.from(acceptedSourceByCandidateId.keys());
  for (const idChunk of chunkArray(acceptedCandidateIds, 200)) {
    if (idChunk.length === 0) {
      continue;
    }

    const traitRows = await readPagedRows<RawPortfolioTraitRow>({
      label: "accepted candidate trait rows",
      fetchPage: (from, to) =>
        ingest
          .from("ingest_candidate_traits")
          .select("candidate_id, trait_type_slug, trait_option_slug")
          .in("candidate_id", idChunk)
          .order("candidate_id", { ascending: true })
          .range(from, to) as unknown as Promise<{
          data: RawPortfolioTraitRow[] | null;
          error: { message: string } | null;
        }>,
    });

    for (const traitRow of traitRows) {
      const sourceKey = acceptedSourceByCandidateId.get(traitRow.candidate_id);
      if (!sourceKey) {
        continue;
      }

      const source = ensureSource(sourceKey);
      source.traitUnits.add(`${traitRow.trait_type_slug}|${traitRow.trait_option_slug}`);
    }
  }

  const totalAcceptedIdeasLast7d = Array.from(sourceMap.values()).reduce(
    (sum, row) => sum + row.acceptedIdeasLast7d,
    0,
  );

  let diversityMethod: "traits" | "title_uniques" = "traits";
  let totalDiversityUnits = Array.from(sourceMap.values()).reduce(
    (sum, row) => sum + row.traitUnits.size,
    0,
  );

  if (totalDiversityUnits === 0) {
    diversityMethod = "title_uniques";
    totalDiversityUnits = Array.from(sourceMap.values()).reduce(
      (sum, row) => sum + row.acceptedTitleSignatures.size,
      0,
    );
  }

  const rows: IngestionSourcePortfolioRow[] = Array.from(sourceMap.values())
    .map((row) => {
      const precisionProxy =
        row.inboxedCandidates > 0 ? row.acceptedIdeas / row.inboxedCandidates : null;
      const maintenanceFailureRate =
        row.runCount > 0 ? (row.partialRuns + row.failedRuns) / row.runCount : null;
      const freshnessContribution =
        totalAcceptedIdeasLast7d > 0 ? row.acceptedIdeasLast7d / totalAcceptedIdeasLast7d : null;
      const diversityUnits =
        diversityMethod === "traits" ? row.traitUnits.size : row.acceptedTitleSignatures.size;
      const diversityContribution =
        totalDiversityUnits > 0 ? diversityUnits / totalDiversityUnits : null;

      return {
        sourceKey: row.sourceKey,
        displayName: row.displayName,
        state: row.state,
        approvedForProd: row.approvedForProd,
        inboxedCandidates: row.inboxedCandidates,
        reviewedCandidates: row.reviewedCandidates,
        acceptedIdeas: row.acceptedIdeas,
        acceptedIdeasLast7d: row.acceptedIdeasLast7d,
        precisionProxy,
        freshnessContribution,
        diversityUnits,
        diversityContribution,
        diversityMethod,
        runCount: row.runCount,
        partialRuns: row.partialRuns,
        failedRuns: row.failedRuns,
        maintenanceFailureRate,
        failedPages: row.failedPages,
        lastCandidateAt: row.lastCandidateAt,
        lastAcceptedAt: row.lastAcceptedAt,
      } satisfies IngestionSourcePortfolioRow;
    })
    .sort((left, right) => {
      if (right.acceptedIdeas !== left.acceptedIdeas) {
        return right.acceptedIdeas - left.acceptedIdeas;
      }

      const rightPrecision = right.precisionProxy ?? -1;
      const leftPrecision = left.precisionProxy ?? -1;
      if (rightPrecision !== leftPrecision) {
        return rightPrecision - leftPrecision;
      }

      return left.sourceKey.localeCompare(right.sourceKey);
    });

  return {
    summary: {
      generatedAt,
      windowDays,
      windowStartAt,
      totalSources: rows.length,
      activeSources: rows.filter((row) => row.state === "active" && row.approvedForProd).length,
      totalInboxedCandidates: rows.reduce((sum, row) => sum + row.inboxedCandidates, 0),
      totalReviewedCandidates: rows.reduce((sum, row) => sum + row.reviewedCandidates, 0),
      totalAcceptedIdeas: rows.reduce((sum, row) => sum + row.acceptedIdeas, 0),
      totalAcceptedIdeasLast7d,
      diversityMethod,
      totalDiversityUnits,
    },
    rows,
  };
}

export async function listIngestionLabelQualityAnalytics(
  requestedWindowDays = 30,
): Promise<IngestionLabelQualityAnalytics> {
  const ingest = createIngestionServiceRoleClient();
  const generatedAt = new Date().toISOString();
  const selectedWindowDays = coercePortfolioWindowDays(requestedWindowDays);
  const maxWindowStartAt = computeWindowStartIso(90);
  const maxWindowStartMs = Date.parse(maxWindowStartAt);

  const rawLabelRows = await readPagedRows<RawEditorLabelRow>({
    label: "editor label rows",
    fetchPage: (from, to) =>
      ingest
        .from("ingest_editor_labels")
        .select(
          "candidate_id, action, reject_reason_code, rewrite_severity, duplicate_confirmed, actor_user_id, created_at",
        )
        .gte("created_at", maxWindowStartAt)
        .order("created_at", { ascending: false })
        .range(from, to) as unknown as Promise<{
        data: RawEditorLabelRow[] | null;
        error: { message: string } | null;
      }>,
  });

  const labelRows: RawEditorLabelRow[] = rawLabelRows.filter((row) => {
    if (!row.created_at) {
      return false;
    }
    const createdMs = Date.parse(row.created_at);
    if (!Number.isFinite(createdMs) || createdMs < maxWindowStartMs) {
      return false;
    }
    return parseEditorLabelAction(row.action) !== null;
  });

  const candidateById = new Map<string, RawLabelCandidateProjectionRow>();
  const candidateIds = Array.from(new Set(labelRows.map((row) => row.candidate_id)));

  for (const idChunk of chunkArray(candidateIds, 200)) {
    if (idChunk.length === 0) {
      continue;
    }

    const { data, error } = await ingest
      .from("ingest_candidates")
      .select("id, source_key, meta_json")
      .in("id", idChunk);

    if (error) {
      throw new Error(`Failed to load label candidate projections: ${error.message}`);
    }

    for (const row of (data ?? []) as RawLabelCandidateProjectionRow[]) {
      candidateById.set(row.id, row);
    }
  }

  const sourceRegistryByKey = new Map<string, RawSourceRegistryQualityRow>();
  const sourceKeys = Array.from(
    new Set(Array.from(candidateById.values()).map((row) => row.source_key)),
  );

  for (const keyChunk of chunkArray(sourceKeys, 200)) {
    if (keyChunk.length === 0) {
      continue;
    }

    const { data, error } = await ingest
      .from("ingest_source_registry")
      .select("source_key, display_name, state, approved_for_prod")
      .in("source_key", keyChunk);

    if (error) {
      throw new Error(`Failed to load source registry quality projections: ${error.message}`);
    }

    for (const row of (data ?? []) as RawSourceRegistryQualityRow[]) {
      sourceRegistryByKey.set(row.source_key, row);
    }
  }

  const labelFacts: IngestionLabelFact[] = [];
  for (const row of labelRows) {
    const action = parseEditorLabelAction(row.action);
    if (!action || !row.created_at) {
      continue;
    }

    const candidate = candidateById.get(row.candidate_id);
    const sourceKey = candidate?.source_key ?? "unknown_source";
    const sourceRegistry = sourceRegistryByKey.get(sourceKey);
    const rejectReasonCode = normalizeOptionalText(row.reject_reason_code);
    const rewriteSeverity = parseRewriteSeverity(row.rewrite_severity);
    const strategy = candidate ? readCandidateExtractionStrategy(candidate.meta_json) : "unknown";

    labelFacts.push({
      createdAt: row.created_at,
      action,
      rejectReasonCode,
      rewriteSeverity,
      duplicateConfirmed:
        typeof row.duplicate_confirmed === "boolean" ? row.duplicate_confirmed : null,
      sourceKey,
      sourceDisplayName: sourceRegistry?.display_name ?? sourceKey,
      sourceState: sourceRegistry?.state ?? "unregistered",
      sourceApprovedForProd: sourceRegistry?.approved_for_prod ?? false,
      strategy,
    });
  }

  const trendRows = LABEL_TREND_WINDOWS.map((windowDays) =>
    buildLabelTrendRow({
      windowDays,
      rows: labelFacts,
    }),
  );
  const selectedWindowStartAt = computeWindowStartIso(selectedWindowDays);
  const selectedWindowStartMs = Date.parse(selectedWindowStartAt);
  const selectedRows = labelFacts.filter((row) => Date.parse(row.createdAt) >= selectedWindowStartMs);

  const sourceRows = Array.from(
    selectedRows.reduce((map, row) => {
      const existing = map.get(row.sourceKey) ?? [];
      existing.push(row);
      map.set(row.sourceKey, existing);
      return map;
    }, new Map<string, IngestionLabelFact[]>()),
  )
    .map(([sourceKey, rows]) => {
      const aggregate = aggregateIngestionLabelFacts(rows);
      const promotedTotal = aggregate.promotedLabels + aggregate.promotedAfterEditLabels;
      const sourceMeta = rows[0];
      return {
        sourceKey,
        displayName: sourceMeta.sourceDisplayName,
        state: sourceMeta.sourceState,
        approvedForProd: sourceMeta.sourceApprovedForProd,
        reviewedLabels: aggregate.reviewedLabels,
        promotedLabels: promotedTotal,
        rejectedLabels: aggregate.rejectedLabels,
        needsWorkLabels: aggregate.needsWorkLabels,
        promotionRate: safeRatio(promotedTotal, aggregate.reviewedLabels),
        rejectionRate: safeRatio(aggregate.rejectedLabels, aggregate.reviewedLabels),
        duplicateConfirmedRate: safeRatio(
          aggregate.duplicateConfirmedLabels,
          aggregate.duplicateKnownLabels,
        ),
        heavyRewriteShare: safeRatio(aggregate.heavyRewriteLabels, aggregate.rewriteKnownLabels),
        topRejectReasonCode: topRejectReasonCode(aggregate.rejectReasonCounts),
        strategyCount: new Set(rows.map((entry) => entry.strategy)).size,
      } satisfies IngestionLabelSourceKpiRow;
    })
    .sort((left, right) => {
      if (right.reviewedLabels !== left.reviewedLabels) {
        return right.reviewedLabels - left.reviewedLabels;
      }
      const rightPromotion = right.promotionRate ?? -1;
      const leftPromotion = left.promotionRate ?? -1;
      if (rightPromotion !== leftPromotion) {
        return rightPromotion - leftPromotion;
      }
      return left.sourceKey.localeCompare(right.sourceKey);
    });

  const strategyRows = Array.from(
    selectedRows.reduce((map, row) => {
      const existing = map.get(row.strategy) ?? [];
      existing.push(row);
      map.set(row.strategy, existing);
      return map;
    }, new Map<string, IngestionLabelFact[]>()),
  )
    .map(([strategy, rows]) => {
      const aggregate = aggregateIngestionLabelFacts(rows);
      const promotedTotal = aggregate.promotedLabels + aggregate.promotedAfterEditLabels;
      return {
        strategy,
        reviewedLabels: aggregate.reviewedLabels,
        promotedLabels: promotedTotal,
        rejectedLabels: aggregate.rejectedLabels,
        needsWorkLabels: aggregate.needsWorkLabels,
        promotionRate: safeRatio(promotedTotal, aggregate.reviewedLabels),
        rejectionRate: safeRatio(aggregate.rejectedLabels, aggregate.reviewedLabels),
        duplicateConfirmedRate: safeRatio(
          aggregate.duplicateConfirmedLabels,
          aggregate.duplicateKnownLabels,
        ),
        heavyRewriteShare: safeRatio(aggregate.heavyRewriteLabels, aggregate.rewriteKnownLabels),
        topRejectReasonCode: topRejectReasonCode(aggregate.rejectReasonCounts),
        sourceCount: new Set(rows.map((entry) => entry.sourceKey)).size,
      } satisfies IngestionLabelStrategyKpiRow;
    })
    .sort((left, right) => {
      if (right.reviewedLabels !== left.reviewedLabels) {
        return right.reviewedLabels - left.reviewedLabels;
      }
      const rightPromotion = right.promotionRate ?? -1;
      const leftPromotion = left.promotionRate ?? -1;
      if (rightPromotion !== leftPromotion) {
        return rightPromotion - leftPromotion;
      }
      return left.strategy.localeCompare(right.strategy);
    });

  return {
    generatedAt,
    selectedWindowDays,
    selectedWindowStartAt,
    trendRows,
    sourceRows,
    strategyRows,
  };
}

export async function listIngestionSourceKeys(): Promise<string[]> {
  const ingest = createIngestionServiceRoleClient();
  const [{ data: candidateRows, error: candidateError }, { data: registryRows, error: registryError }] =
    await Promise.all([
      ingest.from("ingest_candidates").select("source_key").order("source_key", { ascending: true }),
      ingest
        .from("ingest_source_registry")
        .select("source_key")
        .order("source_key", { ascending: true }),
    ]);

  if (candidateError) {
    throw new Error(`Failed to list ingestion source keys from candidates: ${candidateError.message}`);
  }

  if (registryError) {
    throw new Error(`Failed to list ingestion source keys from registry: ${registryError.message}`);
  }

  const keys = [
    ...(candidateRows ?? []).map((row) => String(row.source_key ?? "")),
    ...(registryRows ?? []).map((row) => String(row.source_key ?? "")),
  ];

  return Array.from(
    new Set(keys.filter((value) => value.length > 0)),
  );
}

async function readSourceLifecycleRow(sourceKey: string): Promise<RawSourceLifecycleRow> {
  const ingest = createIngestionServiceRoleClient();
  const { data, error } = await ingest
    .from("ingest_source_registry")
    .select("source_key, state, approved_for_prod, config_version, metadata_json")
    .eq("source_key", sourceKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load source registry row (${sourceKey}): ${error.message}`);
  }

  if (!data) {
    throw new Error(`Source "${sourceKey}" not found in ingest_source_registry.`);
  }

  return data as RawSourceLifecycleRow;
}

export async function reactivateIngestionSource(params: ReactivateIngestionSourceInput): Promise<void> {
  const sourceKey = params.sourceKey.trim();
  if (!sourceKey) {
    throw new Error("Source key is required.");
  }

  const reason = normalizeRequiredReason(params.reason, "Reactivation reason");
  if (!params.productOwnerApproved || !params.complianceAcknowledged) {
    throw new Error(
      "Reactivation requires product owner approval and compliance acknowledgment.",
    );
  }

  const source = await readSourceLifecycleRow(sourceKey);
  const state = parseSourceLifecycleState(source.state);
  if (!state) {
    throw new Error(
      `Unsupported source state "${source.state}" for source "${sourceKey}".`,
    );
  }

  if (!canReactivateIngestionSourceState(state)) {
    throw new Error(`Source "${sourceKey}" cannot be reactivated from state "${state}".`);
  }

  const nowIso = new Date().toISOString();
  const metadata = toMetaJson(source.metadata_json);
  const lifecycle = toMetaJson(metadata.lifecycle);
  const reactivationEntry: Record<string, unknown> = {
    workflow_version: LIFECYCLE_WORKFLOW_VERSION,
    source_key: sourceKey,
    from_state: state,
    to_state: "active",
    reason,
    product_owner_approved: true,
    compliance_acknowledged: true,
    actor_user_id: params.actorUserId,
    decided_at: nowIso,
  };
  const lifecyclePatch = {
    ...lifecycle,
    last_transition: reactivationEntry,
    reactivation: reactivationEntry,
    reactivation_history: appendBoundedHistory(
      lifecycle.reactivation_history,
      reactivationEntry,
    ),
    last_reactivated_at: nowIso,
  };

  const ingest = createIngestionServiceRoleClient();
  const configVersion = nextSourceConfigVersion(source.config_version, nowIso);

  const { error: configError } = await ingest.rpc("update_source_config", {
    p_source_key: sourceKey,
    p_patch: {
      approved_for_prod: true,
      metadata_json: {
        lifecycle: lifecyclePatch,
      },
    },
    p_config_version: configVersion,
    p_actor_user_id: params.actorUserId,
    p_reason: `ING-033 source reactivation review recorded: ${reason}`,
  });

  if (configError) {
    throw new Error(
      `Failed to update source metadata before reactivation (${sourceKey}): ${configError.message}`,
    );
  }

  const { error: stateError } = await ingest.rpc("set_source_state", {
    p_source_key: sourceKey,
    p_state: "active",
    p_reason: `ING-033 source reactivated after review: ${reason}`,
    p_actor_user_id: params.actorUserId,
  });

  if (stateError) {
    throw new Error(`Failed to reactivate source (${sourceKey}): ${stateError.message}`);
  }
}

export async function retireIngestionSource(params: RetireIngestionSourceInput): Promise<void> {
  const sourceKey = params.sourceKey.trim();
  if (!sourceKey) {
    throw new Error("Source key is required.");
  }

  const reason = normalizeRequiredReason(params.reason, "Retirement reason");
  if (!params.productOwnerApproved || !params.complianceAcknowledged) {
    throw new Error(
      "Retirement requires product owner approval and compliance acknowledgment.",
    );
  }

  const source = await readSourceLifecycleRow(sourceKey);
  const state = parseSourceLifecycleState(source.state);
  if (!state) {
    throw new Error(
      `Unsupported source state "${source.state}" for source "${sourceKey}".`,
    );
  }

  if (!canRetireIngestionSourceState(state)) {
    if (state === "retired") {
      throw new Error(`Source "${sourceKey}" is already retired.`);
    }
    throw new Error(`Source "${sourceKey}" cannot be retired from state "${state}".`);
  }

  const archivalReference = normalizeOptionalText(params.archivalReference);
  const archivalSummary = normalizeOptionalText(params.archivalSummary);
  const nowIso = new Date().toISOString();
  const metadata = toMetaJson(source.metadata_json);
  const lifecycle = toMetaJson(metadata.lifecycle);
  const retirementEntry: Record<string, unknown> = {
    workflow_version: LIFECYCLE_WORKFLOW_VERSION,
    source_key: sourceKey,
    from_state: state,
    to_state: "retired",
    reason,
    product_owner_approved: true,
    compliance_acknowledged: true,
    archival_reference: archivalReference,
    archival_summary: archivalSummary,
    actor_user_id: params.actorUserId,
    decided_at: nowIso,
  };

  const ingest = createIngestionServiceRoleClient();
  const { error: stateError } = await ingest.rpc("set_source_state", {
    p_source_key: sourceKey,
    p_state: "retired",
    p_reason: `ING-033 source retired: ${reason}`,
    p_actor_user_id: params.actorUserId,
  });

  if (stateError) {
    throw new Error(`Failed to retire source (${sourceKey}): ${stateError.message}`);
  }

  const lifecyclePatch = {
    ...lifecycle,
    last_transition: retirementEntry,
    retirement: retirementEntry,
    retirement_history: appendBoundedHistory(lifecycle.retirement_history, retirementEntry),
    retired_at: nowIso,
  };
  const configVersion = nextSourceConfigVersion(source.config_version, nowIso);

  const { error: configError } = await ingest.rpc("update_source_config", {
    p_source_key: sourceKey,
    p_patch: {
      approved_for_prod: false,
      cadence: null,
      metadata_json: {
        lifecycle: lifecyclePatch,
      },
    },
    p_config_version: configVersion,
    p_actor_user_id: params.actorUserId,
    p_reason: `ING-033 retirement archival metadata recorded: ${reason}`,
  });

  if (configError) {
    throw new Error(
      `Source "${sourceKey}" was retired but metadata update failed: ${configError.message}`,
    );
  }
}

export async function listIngestionCandidates(
  filters: IngestionListFilters = {},
): Promise<IngestionCandidate[]> {
  const ingest = createIngestionServiceRoleClient();
  const status = filters.status ?? "all";
  const sourceKey = (filters.sourceKey ?? "").trim();
  const query = (filters.query ?? "").trim();
  const confidence = filters.confidence ?? "all";
  const duplicateRisk = filters.duplicateRisk ?? "all";
  const dateFrom = (filters.dateFrom ?? "").trim();
  const dateTo = (filters.dateTo ?? "").trim();
  const limit = filters.limit ?? 100;
  const dbLimit = Math.min(Math.max(limit * 5, 200), 1000);

  let request = ingest
    .from("ingest_candidates")
    .select(
      "id, run_id, page_id, source_key, source_url, title, description, reason_snippet, raw_excerpt, candidate_key, status, meta_json, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(dbLimit);

  if (status !== "all") {
    request = request.eq("status", status);
  }

  if (sourceKey) {
    request = request.eq("source_key", sourceKey);
  }

  if (query) {
    const pattern = `%${query}%`;
    request = request.or(
      `title.ilike.${pattern},description.ilike.${pattern},source_url.ilike.${pattern}`,
    );
  }

  if (isDateFilterValue(dateFrom)) {
    request = request.gte("updated_at", toUtcDateRange(dateFrom, "start"));
  }

  if (isDateFilterValue(dateTo)) {
    request = request.lte("updated_at", toUtcDateRange(dateTo, "end"));
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(`Failed to list ingestion candidates: ${error.message}`);
  }

  const mapped = (data ?? []).map((row) => mapCandidate(row as RawCandidateRow));
  const filtered = mapped.filter((candidate) => {
    if (confidence !== "all" && candidate.confidenceBand !== confidence) {
      return false;
    }

    if (duplicateRisk !== "all" && candidate.duplicateRisk !== duplicateRisk) {
      return false;
    }

    return true;
  });

  return filtered.slice(0, limit);
}

export async function getIngestionCandidateDetail(
  candidateId: string,
): Promise<IngestionCandidateDetail | null> {
  const ingest = createIngestionServiceRoleClient();

  const { data: candidateRow, error: candidateError } = await ingest
    .from("ingest_candidates")
    .select(
      "id, run_id, page_id, source_key, source_url, title, description, reason_snippet, raw_excerpt, candidate_key, status, meta_json, created_at, updated_at",
    )
    .eq("id", candidateId)
    .maybeSingle();

  if (candidateError) {
    throw new Error(`Failed to load ingestion candidate: ${candidateError.message}`);
  }

  if (!candidateRow) {
    return null;
  }

  const [{ data: traitRows, error: traitError }, { data: syncRows, error: syncError }] =
    await Promise.all([
      ingest
        .from("ingest_candidate_traits")
        .select(
          "id, candidate_id, trait_type_slug, trait_option_slug, confidence, source, created_at",
        )
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: true }),
      ingest
        .from("ingest_sync_log")
        .select("id, candidate_id, target_system, target_id, status, synced_at, error_text")
        .eq("candidate_id", candidateId)
        .order("synced_at", { ascending: false }),
    ]);

  if (traitError) {
    throw new Error(`Failed to load ingestion candidate traits: ${traitError.message}`);
  }

  if (syncError) {
    throw new Error(`Failed to load ingestion sync log: ${syncError.message}`);
  }

  const { data: duplicateRows, error: duplicateError } = await ingest
    .from("ingest_candidates")
    .select("id, source_url, title, candidate_key, status, updated_at")
    .eq("source_key", candidateRow.source_key)
    .neq("id", candidateId)
    .in("status", ["normalized", "curated", "pushed_to_studio"])
    .order("updated_at", { ascending: false })
    .limit(250);

  if (duplicateError) {
    throw new Error(`Failed to load duplicate hints: ${duplicateError.message}`);
  }

  const mappedCandidate = mapCandidate(candidateRow as RawCandidateRow);
  const duplicateHints = computeDuplicateHints({
    candidate: mappedCandidate,
    rows: (duplicateRows ?? []) as RawDuplicateHintRow[],
  });
  const duplicateCandidateIds = duplicateHints.map((hint) => hint.candidateId);
  const draftIdByCandidateId = new Map<string, string>();

  if (duplicateCandidateIds.length > 0) {
    const { data: duplicateSyncRows, error: duplicateSyncError } = await ingest
      .from("ingest_sync_log")
      .select("candidate_id, target_id, synced_at")
      .eq("target_system", "app_draft")
      .eq("status", "success")
      .in("candidate_id", duplicateCandidateIds)
      .not("target_id", "is", null)
      .order("synced_at", { ascending: false });

    if (duplicateSyncError) {
      throw new Error(
        `Failed to load duplicate hint draft links: ${duplicateSyncError.message}`,
      );
    }

    for (const row of (duplicateSyncRows ?? []) as RawDuplicateSyncRow[]) {
      if (!row.target_id || draftIdByCandidateId.has(row.candidate_id)) {
        continue;
      }
      draftIdByCandidateId.set(row.candidate_id, row.target_id);
    }
  }

  return {
    candidate: mappedCandidate,
    traits: (traitRows ?? []).map((row) => mapTrait(row as RawTraitRow)),
    syncLog: (syncRows ?? []).map((row) => mapSyncLog(row as RawSyncLogRow)),
    duplicateHints: duplicateHints.map((hint) => ({
      ...hint,
      promotedDraftId: draftIdByCandidateId.get(hint.candidateId) ?? null,
    })),
  };
}

function appendStudioReviewMetadata(params: {
  existingMeta: Record<string, unknown>;
  action: "reject" | "needs_work";
  note: string | null;
  actorUserId: string;
  labelAction: IngestionEditorLabelAction;
  rejectReasonCode?: IngestionRejectionReasonCode | null;
  rewriteSeverity?: IngestionRewriteSeverity | null;
  duplicateConfirmed: boolean;
}): Record<string, unknown> {
  return {
    ...params.existingMeta,
    studio_review: {
      last_action: params.action,
      last_note: params.note,
      last_actor_user_id: params.actorUserId,
      last_action_at: new Date().toISOString(),
      last_label_action: params.labelAction,
      last_reject_reason_code: params.rejectReasonCode ?? null,
      last_rewrite_severity: params.rewriteSeverity ?? null,
      last_duplicate_confirmed: params.duplicateConfirmed,
    },
  };
}

async function insertIngestionEditorLabel(params: {
  candidateId: string;
  action: IngestionEditorLabelAction;
  rejectReasonCode?: IngestionRejectionReasonCode | null;
  rewriteSeverity?: IngestionRewriteSeverity | null;
  duplicateConfirmed: boolean;
  actorUserId: string;
}): Promise<void> {
  const ingest = createIngestionServiceRoleClient();
  const { error } = await ingest.from("ingest_editor_labels").insert({
    candidate_id: params.candidateId,
    action: params.action,
    reject_reason_code: params.rejectReasonCode ?? null,
    rewrite_severity: params.rewriteSeverity ?? null,
    duplicate_confirmed: params.duplicateConfirmed,
    actor_user_id: params.actorUserId,
  });

  if (error) {
    throw new Error(`Failed to write ingestion editor label: ${error.message}`);
  }
}

async function setCandidateStatusWithNote(params: {
  candidateId: string;
  status: IngestCandidateStatus;
  action: "reject" | "needs_work";
  labelAction: IngestionEditorLabelAction;
  note: string | null;
  rejectReasonCode?: IngestionRejectionReasonCode | null;
  rewriteSeverity?: IngestionRewriteSeverity | null;
  duplicateConfirmed: boolean;
  actorUserId: string;
}): Promise<void> {
  const ingest = createIngestionServiceRoleClient();

  const { data, error } = await ingest
    .from("ingest_candidates")
    .select("meta_json")
    .eq("id", params.candidateId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load candidate metadata: ${error.message}`);
  }

  if (!data) {
    throw new Error("Candidate not found.");
  }

  const nextMeta = appendStudioReviewMetadata({
    existingMeta: toMetaJson(data.meta_json),
    action: params.action,
    note: params.note,
    actorUserId: params.actorUserId,
    labelAction: params.labelAction,
    rejectReasonCode: params.rejectReasonCode,
    rewriteSeverity: params.rewriteSeverity,
    duplicateConfirmed: params.duplicateConfirmed,
  });

  const { error: updateError } = await ingest
    .from("ingest_candidates")
    .update({
      status: params.status,
      meta_json: nextMeta,
    })
    .eq("id", params.candidateId);

  if (updateError) {
    throw new Error(`Failed to update candidate status: ${updateError.message}`);
  }

  await insertIngestionEditorLabel({
    candidateId: params.candidateId,
    action: params.labelAction,
    rejectReasonCode: params.rejectReasonCode,
    rewriteSeverity: params.rewriteSeverity,
    duplicateConfirmed: params.duplicateConfirmed,
    actorUserId: params.actorUserId,
  });
}

export async function rejectIngestionCandidate(params: {
  candidateId: string;
  actorUserId: string;
  note: string | null;
  rejectReasonCode: string;
  duplicateConfirmed: boolean;
}): Promise<void> {
  const rejectReasonCode = normalizeRejectReasonCode(params.rejectReasonCode);

  await setCandidateStatusWithNote({
    candidateId: params.candidateId,
    status: "rejected",
    action: "reject",
    labelAction: "rejected",
    note: params.note,
    rejectReasonCode,
    duplicateConfirmed: params.duplicateConfirmed,
    actorUserId: params.actorUserId,
  });
}

export async function markIngestionCandidateNeedsWork(params: {
  candidateId: string;
  actorUserId: string;
  note: string | null;
  rewriteSeverity: string;
  duplicateConfirmed: boolean;
}): Promise<void> {
  const rewriteSeverity = normalizeRewriteSeverity(params.rewriteSeverity);

  await setCandidateStatusWithNote({
    candidateId: params.candidateId,
    status: "curated",
    action: "needs_work",
    labelAction: "needs_work",
    note: params.note,
    rewriteSeverity,
    duplicateConfirmed: params.duplicateConfirmed,
    actorUserId: params.actorUserId,
  });
}

async function createPendingSyncLog(params: {
  candidateId: string;
  targetSystem: string;
}): Promise<string> {
  const ingest = createIngestionServiceRoleClient();
  const { data, error } = await ingest
    .from("ingest_sync_log")
    .insert({
      candidate_id: params.candidateId,
      target_system: params.targetSystem,
      target_id: null,
      status: "pending",
      error_text: null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create pending ingestion sync log: ${error.message}`);
  }

  return String(data.id);
}

async function finalizeSyncLog(params: {
  syncLogId: string;
  status: "success" | "failed";
  targetId?: string | null;
  errorText?: string | null;
}): Promise<void> {
  const ingest = createIngestionServiceRoleClient();
  const { error } = await ingest
    .from("ingest_sync_log")
    .update({
      status: params.status,
      target_id: params.targetId ?? null,
      error_text: params.errorText ?? null,
      synced_at: new Date().toISOString(),
    })
    .eq("id", params.syncLogId);

  if (error) {
    throw new Error(`Failed to finalize ingestion sync log: ${error.message}`);
  }
}

async function updateCandidateStatus(
  candidateId: string,
  status: IngestCandidateStatus,
): Promise<void> {
  const ingest = createIngestionServiceRoleClient();
  const { error } = await ingest
    .from("ingest_candidates")
    .update({ status })
    .eq("id", candidateId);

  if (error) {
    throw new Error(`Failed to update ingestion candidate status: ${error.message}`);
  }
}

function dedupeCandidateTraits(traits: IngestionCandidateTrait[]): IngestionCandidateTrait[] {
  const output: IngestionCandidateTrait[] = [];
  const seen = new Set<string>();

  for (const trait of traits) {
    const key = `${trait.traitTypeSlug}|${trait.traitOptionSlug}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(trait);
  }

  return output;
}

async function syncDraftTraitsFromCandidateTraits(params: {
  appSupabase: SupabaseClient;
  draftId: string;
  traits: IngestionCandidateTrait[];
}): Promise<string[]> {
  const warnings: string[] = [];
  const traits = dedupeCandidateTraits(params.traits);

  const { appSupabase, draftId } = params;
  const { error: deleteError } = await appSupabase
    .from("idea_draft_traits")
    .delete()
    .eq("draft_id", draftId);

  if (deleteError) {
    throw new Error(`Failed to clear draft traits: ${deleteError.message}`);
  }

  if (traits.length === 0) {
    return warnings;
  }

  const typeSlugs = Array.from(new Set(traits.map((trait) => trait.traitTypeSlug)));

  const { data: typeRows, error: typeError } = await appSupabase
    .from("trait_types")
    .select("id, slug")
    .in("slug", typeSlugs);

  if (typeError) {
    throw new Error(`Failed to resolve trait types: ${typeError.message}`);
  }

  const traitTypeIdBySlug = new Map(
    (typeRows ?? []).map((row) => [String(row.slug), String(row.id)]),
  );
  const traitTypeIds = Array.from(traitTypeIdBySlug.values());

  if (traitTypeIds.length === 0) {
    warnings.push("No candidate traits matched trait_types in app DB.");
    return warnings;
  }

  const [{ data: bindingRows, error: bindingError }, { data: optionRows, error: optionError }] =
    await Promise.all([
      appSupabase
        .from("trait_bindings")
        .select("trait_type_id, select_mode")
        .eq("context", "idea")
        .in("trait_type_id", traitTypeIds),
      appSupabase
        .from("trait_options")
        .select("id, trait_type_id, slug")
        .in("trait_type_id", traitTypeIds),
    ]);

  if (bindingError) {
    throw new Error(`Failed to resolve trait bindings: ${bindingError.message}`);
  }

  if (optionError) {
    throw new Error(`Failed to resolve trait options: ${optionError.message}`);
  }

  const selectModeByTypeId = new Map(
    (bindingRows ?? []).map((row) => [String(row.trait_type_id), String(row.select_mode)]),
  );
  const optionByTypeAndSlug = new Map(
    (optionRows ?? []).map((row) => [
      `${String(row.trait_type_id)}|${String(row.slug)}`,
      String(row.id),
    ]),
  );

  const insertRows: Array<{
    draft_id: string;
    trait_type_id: string;
    trait_option_id: string;
    select_mode: "single" | "multi";
  }> = [];

  for (const trait of traits) {
    const traitTypeId = traitTypeIdBySlug.get(trait.traitTypeSlug);
    if (!traitTypeId) {
      warnings.push(`Skipped unknown trait type slug: ${trait.traitTypeSlug}`);
      continue;
    }

    const selectMode = selectModeByTypeId.get(traitTypeId);
    if (!selectMode || (selectMode !== "single" && selectMode !== "multi")) {
      warnings.push(`Skipped trait without idea binding: ${trait.traitTypeSlug}`);
      continue;
    }

    const traitOptionId = optionByTypeAndSlug.get(
      `${traitTypeId}|${trait.traitOptionSlug}`,
    );
    if (!traitOptionId) {
      warnings.push(
        `Skipped unknown trait option slug for ${trait.traitTypeSlug}: ${trait.traitOptionSlug}`,
      );
      continue;
    }

    insertRows.push({
      draft_id: draftId,
      trait_type_id: traitTypeId,
      trait_option_id: traitOptionId,
      select_mode: selectMode,
    });
  }

  if (insertRows.length === 0) {
    return warnings;
  }

  const { error: insertError } = await appSupabase
    .from("idea_draft_traits")
    .insert(insertRows);

  if (insertError) {
    throw new Error(`Failed to save draft traits: ${insertError.message}`);
  }

  return warnings;
}

async function getExistingDraftForCandidate(
  appSupabase: SupabaseClient,
  candidateId: string,
): Promise<string | null> {
  const { data, error } = await appSupabase
    .from("idea_drafts")
    .select("id")
    .eq("ingest_candidate_id", candidateId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check existing promoted draft: ${error.message}`);
  }

  return data?.id ? String(data.id) : null;
}

async function getCandidateTraits(candidateId: string): Promise<IngestionCandidateTrait[]> {
  const ingest = createIngestionServiceRoleClient();
  const { data, error } = await ingest
    .from("ingest_candidate_traits")
    .select(
      "id, candidate_id, trait_type_slug, trait_option_slug, confidence, source, created_at",
    )
    .eq("candidate_id", candidateId);

  if (error) {
    throw new Error(`Failed to load candidate traits: ${error.message}`);
  }

  return (data ?? []).map((row) => mapTrait(row as RawTraitRow));
}

export async function promoteIngestionCandidateToDraft(params: {
  candidateId: string;
  actorUserId: string;
  rewriteSeverity: string;
  duplicateConfirmed: boolean;
  promotedAfterEdit: boolean;
}): Promise<PromoteIngestionCandidateResult> {
  const warnings: string[] = [];
  const appSupabase = await createSupabaseServerClient();
  const ingest = createIngestionServiceRoleClient();
  const rewriteSeverity = normalizeRewriteSeverity(params.rewriteSeverity);
  const labelAction: IngestionEditorLabelAction = params.promotedAfterEdit
    ? "promoted_after_edit"
    : "promoted";

  const { data: candidateRow, error: candidateError } = await ingest
    .from("ingest_candidates")
    .select(
      "id, source_url, title, description, reason_snippet, status, meta_json, created_at, updated_at, run_id, page_id, source_key, raw_excerpt, candidate_key",
    )
    .eq("id", params.candidateId)
    .maybeSingle();

  if (candidateError) {
    throw new Error(`Failed to load candidate for promotion: ${candidateError.message}`);
  }

  if (!candidateRow) {
    throw new Error("Candidate not found.");
  }

  const candidate = mapCandidate(candidateRow as RawCandidateRow);
  if (candidate.status === "rejected" || candidate.status === "exported") {
    throw new Error(`Cannot promote candidate from status "${candidate.status}".`);
  }

  const pendingSyncLogId = await createPendingSyncLog({
    candidateId: params.candidateId,
    targetSystem: "app_draft",
  });

  let createdDraftId: string;
  let created = false;

  try {
    const existingDraftId = await getExistingDraftForCandidate(appSupabase, params.candidateId);
    if (existingDraftId) {
      createdDraftId = existingDraftId;
    } else {
      const { data: insertedDraft, error: insertError } = await appSupabase
        .from("idea_drafts")
        .insert({
          title: candidate.title,
          description: candidate.description,
          reason_snippet: candidate.reasonSnippet,
          source_url: candidate.sourceUrl,
          status: "draft",
          active: true,
          ingest_candidate_id: params.candidateId,
          created_by: params.actorUserId,
          updated_by: params.actorUserId,
        })
        .select("id")
        .single();

      if (insertError) {
        const code = (insertError as { code?: string }).code;
        if (code === "23505") {
          const concurrentDraftId = await getExistingDraftForCandidate(
            appSupabase,
            params.candidateId,
          );
          if (concurrentDraftId) {
            createdDraftId = concurrentDraftId;
          } else {
            throw new Error(
              "Draft creation hit unique conflict but existing draft could not be resolved.",
            );
          }
        } else {
          throw new Error(`Failed to create draft from candidate: ${insertError.message}`);
        }
      } else {
        createdDraftId = String(insertedDraft.id);
        created = true;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await finalizeSyncLog({
        syncLogId: pendingSyncLogId,
        status: "failed",
        errorText: message.slice(0, 2000),
      });
    } catch (syncError) {
      const syncMessage = syncError instanceof Error ? syncError.message : String(syncError);
      throw new Error(`${message} (also failed to record sync failure: ${syncMessage})`);
    }
    throw new Error(message);
  }

  try {
    const traits = await getCandidateTraits(params.candidateId);
    const traitWarnings = await syncDraftTraitsFromCandidateTraits({
      appSupabase,
      draftId: createdDraftId,
      traits,
    });
    warnings.push(...traitWarnings);
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  try {
    await updateCandidateStatus(params.candidateId, "pushed_to_studio");
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  try {
    await insertIngestionEditorLabel({
      candidateId: params.candidateId,
      action: labelAction,
      rewriteSeverity,
      duplicateConfirmed: params.duplicateConfirmed,
      actorUserId: params.actorUserId,
    });
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  try {
    await finalizeSyncLog({
      syncLogId: pendingSyncLogId,
      status: "success",
      targetId: createdDraftId,
      errorText: null,
    });
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  return {
    draftId: createdDraftId,
    created,
    warnings,
  };
}
