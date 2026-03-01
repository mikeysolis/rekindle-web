import Link from "next/link";
import { redirect } from "next/navigation";

import StudioShell from "@/components/studio/StudioShell";
import { requireStudioUser } from "@/lib/studio/auth";
import {
  canReactivateIngestionSourceState,
  canRetireIngestionSourceState,
  INGEST_CANDIDATE_STATUSES,
  type IngestionConfidenceFilter,
  type IngestionDuplicateRiskFilter,
  type IngestionPortfolioWindowDays,
  listIngestionCandidates,
  listIngestionLabelQualityAnalytics,
  listIngestionSourcePortfolioMetrics,
  listIngestionSourceKeys,
  reactivateIngestionSource,
  retireIngestionSource,
  type IngestCandidateStatus,
} from "@/lib/studio/ingestion";
import { hasStudioRoleAtLeast } from "@/lib/studio/roles";

type IngestionPageProps = {
  searchParams?: Promise<{
    status?: string;
    source?: string;
    q?: string;
    confidence?: string;
    duplicateRisk?: string;
    dateFrom?: string;
    dateTo?: string;
    portfolioWindow?: string;
    sourceSaved?: string;
    sourceError?: string;
  }>;
};

const STATUS_OPTIONS: Array<{ label: string; value: IngestCandidateStatus }> = [
  { label: "New", value: "new" },
  { label: "Normalized", value: "normalized" },
  { label: "Curated", value: "curated" },
  { label: "Pushed to Studio", value: "pushed_to_studio" },
  { label: "Exported", value: "exported" },
  { label: "Rejected", value: "rejected" },
];

const CONFIDENCE_OPTIONS: Array<{ label: string; value: IngestionConfidenceFilter }> = [
  { label: "All confidence", value: "all" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
  { label: "Unknown", value: "unknown" },
];

const DUPLICATE_RISK_OPTIONS: Array<{ label: string; value: IngestionDuplicateRiskFilter }> = [
  { label: "All duplicate risk", value: "all" },
  { label: "Likely duplicate", value: "likely" },
  { label: "Low duplicate risk", value: "low" },
];

const PORTFOLIO_WINDOW_OPTIONS: Array<{
  label: string;
  value: IngestionPortfolioWindowDays;
}> = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
];

function parseConfidenceFilter(value: string): IngestionConfidenceFilter {
  if (
    value === "all" ||
    value === "high" ||
    value === "medium" ||
    value === "low" ||
    value === "unknown"
  ) {
    return value;
  }

  return "all";
}

function parseDuplicateRiskFilter(value: string): IngestionDuplicateRiskFilter {
  if (value === "all" || value === "likely" || value === "low") {
    return value;
  }

  return "all";
}

function parsePortfolioWindow(value: string): IngestionPortfolioWindowDays {
  if (value === "7") {
    return 7;
  }

  if (value === "90") {
    return 90;
  }

  return 30;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function normalizeLifecycleText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isChecked(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true";
}

export default async function StudioIngestionPage({ searchParams }: IngestionPageProps) {
  const studioUser = await requireStudioUser("viewer");
  const params = (await searchParams) ?? {};
  const canGovernSources = hasStudioRoleAtLeast(studioUser.role, "admin");

  const rawStatus = (params.status ?? "").trim();
  const status: IngestCandidateStatus | "all" =
    rawStatus && INGEST_CANDIDATE_STATUSES.includes(rawStatus as IngestCandidateStatus)
      ? (rawStatus as IngestCandidateStatus)
      : "curated";
  const source = (params.source ?? "").trim();
  const query = (params.q ?? "").trim();
  const confidence = parseConfidenceFilter((params.confidence ?? "").trim());
  const duplicateRisk = parseDuplicateRiskFilter((params.duplicateRisk ?? "").trim());
  const dateFrom = (params.dateFrom ?? "").trim();
  const dateTo = (params.dateTo ?? "").trim();
  const portfolioWindow = parsePortfolioWindow((params.portfolioWindow ?? "").trim());
  const sourceSaved = (params.sourceSaved ?? "").trim();
  const sourceError = (params.sourceError ?? "").trim();

  const [candidates, sourceKeys, sourcePortfolio, labelQualityAnalytics] = await Promise.all([
    listIngestionCandidates({
      status,
      sourceKey: source || undefined,
      query: query || undefined,
      confidence,
      duplicateRisk,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 200,
    }),
    listIngestionSourceKeys(),
    listIngestionSourcePortfolioMetrics(portfolioWindow),
    listIngestionLabelQualityAnalytics(portfolioWindow),
  ]);
  const selectedLabelTrend =
    labelQualityAnalytics.trendRows.find((row) => row.windowDays === portfolioWindow) ??
    labelQualityAnalytics.trendRows[1] ??
    labelQualityAnalytics.trendRows[0] ??
    null;
  const reactivatableSources = sourcePortfolio.rows.filter((row) =>
    canReactivateIngestionSourceState(row.state),
  );
  const retireableSources = sourcePortfolio.rows.filter((row) =>
    canRetireIngestionSourceState(row.state),
  );

  const baseQueryEntries: Array<[string, string]> = [];
  if (status !== "curated") {
    baseQueryEntries.push(["status", status]);
  }
  if (source) {
    baseQueryEntries.push(["source", source]);
  }
  if (query) {
    baseQueryEntries.push(["q", query]);
  }
  if (confidence !== "all") {
    baseQueryEntries.push(["confidence", confidence]);
  }
  if (duplicateRisk !== "all") {
    baseQueryEntries.push(["duplicateRisk", duplicateRisk]);
  }
  if (dateFrom) {
    baseQueryEntries.push(["dateFrom", dateFrom]);
  }
  if (dateTo) {
    baseQueryEntries.push(["dateTo", dateTo]);
  }
  if (portfolioWindow !== 30) {
    baseQueryEntries.push(["portfolioWindow", String(portfolioWindow)]);
  }

  async function reactivateSourceAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("admin");
    const sourceKey = String(formData.get("source_key") ?? "").trim();
    const reason = normalizeLifecycleText(formData.get("reason"));
    const productOwnerApproved = isChecked(formData.get("product_owner_approved"));
    const complianceAcknowledged = isChecked(formData.get("compliance_acknowledged"));

    if (!sourceKey) {
      const queryParams = new URLSearchParams(baseQueryEntries);
      queryParams.set("sourceError", "Source key is required for reactivation.");
      const queryString = queryParams.toString();
      redirect(queryString.length > 0 ? `/studio/ingestion?${queryString}` : "/studio/ingestion");
    }

    try {
      await reactivateIngestionSource({
        sourceKey,
        actorUserId: actingUser.userId,
        reason: reason ?? "",
        productOwnerApproved,
        complianceAcknowledged,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const queryParams = new URLSearchParams(baseQueryEntries);
      queryParams.set("source", sourceKey);
      queryParams.set("sourceError", message);
      const queryString = queryParams.toString();
      redirect(queryString.length > 0 ? `/studio/ingestion?${queryString}` : "/studio/ingestion");
    }

    const queryParams = new URLSearchParams(baseQueryEntries);
    queryParams.set("source", sourceKey);
    queryParams.set("sourceSaved", `Reactivated source ${sourceKey}.`);
    const queryString = queryParams.toString();
    redirect(queryString.length > 0 ? `/studio/ingestion?${queryString}` : "/studio/ingestion");
  }

  async function retireSourceAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("admin");
    const sourceKey = String(formData.get("source_key") ?? "").trim();
    const reason = normalizeLifecycleText(formData.get("reason"));
    const archivalReference = normalizeLifecycleText(formData.get("archival_reference"));
    const archivalSummary = normalizeLifecycleText(formData.get("archival_summary"));
    const productOwnerApproved = isChecked(formData.get("product_owner_approved"));
    const complianceAcknowledged = isChecked(formData.get("compliance_acknowledged"));

    if (!sourceKey) {
      const queryParams = new URLSearchParams(baseQueryEntries);
      queryParams.set("sourceError", "Source key is required for retirement.");
      const queryString = queryParams.toString();
      redirect(queryString.length > 0 ? `/studio/ingestion?${queryString}` : "/studio/ingestion");
    }

    try {
      await retireIngestionSource({
        sourceKey,
        actorUserId: actingUser.userId,
        reason: reason ?? "",
        productOwnerApproved,
        complianceAcknowledged,
        archivalReference,
        archivalSummary,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const queryParams = new URLSearchParams(baseQueryEntries);
      queryParams.set("source", sourceKey);
      queryParams.set("sourceError", message);
      const queryString = queryParams.toString();
      redirect(queryString.length > 0 ? `/studio/ingestion?${queryString}` : "/studio/ingestion");
    }

    const queryParams = new URLSearchParams(baseQueryEntries);
    queryParams.set("source", sourceKey);
    queryParams.set("sourceSaved", `Retired source ${sourceKey}.`);
    const queryString = queryParams.toString();
    redirect(queryString.length > 0 ? `/studio/ingestion?${queryString}` : "/studio/ingestion");
  }

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Ingestion Inbox</h2>
          <p className="text-sm text-zinc-600">
            Review scraped candidates and promote only the rows that are editorially clean.
          </p>
          <p className="text-xs text-zinc-500">
            Default filter is <span className="font-medium">Curated</span>; switch to{" "}
            <span className="font-medium">All statuses</span> to inspect machine-filtered rows.
          </p>
        </div>

        <form className="grid gap-3 rounded border border-zinc-300 bg-white p-4 md:grid-cols-6">
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Search</span>
            <input
              name="q"
              defaultValue={query}
              placeholder="title, description, source url"
              className="w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Status</span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded border border-zinc-300 px-3 py-2"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Source</span>
            <select
              name="source"
              defaultValue={source}
              className="w-full rounded border border-zinc-300 px-3 py-2"
            >
              <option value="">All sources</option>
              {sourceKeys.map((sourceKey) => (
                <option key={sourceKey} value={sourceKey}>
                  {sourceKey}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Confidence</span>
            <select
              name="confidence"
              defaultValue={confidence}
              className="w-full rounded border border-zinc-300 px-3 py-2"
            >
              {CONFIDENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Duplicate risk</span>
            <select
              name="duplicateRisk"
              defaultValue={duplicateRisk}
              className="w-full rounded border border-zinc-300 px-3 py-2"
            >
              {DUPLICATE_RISK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Updated from</span>
            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              className="w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Updated to</span>
            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              className="w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Portfolio window</span>
            <select
              name="portfolioWindow"
              defaultValue={String(portfolioWindow)}
              className="w-full rounded border border-zinc-300 px-3 py-2"
            >
              {PORTFOLIO_WINDOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-6">
            <button
              type="submit"
              className="rounded border border-zinc-300 px-4 py-2 text-sm hover:border-zinc-600"
            >
              Apply filters
            </button>
          </div>
        </form>

        <section className="space-y-3 rounded border border-zinc-300 bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Source Portfolio</h3>
              <p className="text-xs text-zinc-600">
                Window: last {sourcePortfolio.summary.windowDays} days (from{" "}
                {formatDateTime(sourcePortfolio.summary.windowStartAt)})
              </p>
            </div>
            <p className="text-xs text-zinc-500">
              Generated: {formatDateTime(sourcePortfolio.summary.generatedAt)}
            </p>
          </div>
          {sourceSaved && (
            <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {sourceSaved}
            </p>
          )}
          {sourceError && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {sourceError}
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-4">
            <article className="rounded border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Accepted Ideas</p>
              <p className="mt-1 text-2xl font-semibold">{sourcePortfolio.summary.totalAcceptedIdeas}</p>
            </article>
            <article className="rounded border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Precision Base</p>
              <p className="mt-1 text-2xl font-semibold">
                {sourcePortfolio.summary.totalInboxedCandidates}
              </p>
              <p className="text-xs text-zinc-600">inboxed candidates</p>
            </article>
            <article className="rounded border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Active Sources</p>
              <p className="mt-1 text-2xl font-semibold">
                {sourcePortfolio.summary.activeSources}
                <span className="ml-1 text-sm text-zinc-500">/ {sourcePortfolio.summary.totalSources}</span>
              </p>
            </article>
            <article className="rounded border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Diversity Method</p>
              <p className="mt-1 text-lg font-semibold">{sourcePortfolio.summary.diversityMethod}</p>
              <p className="text-xs text-zinc-600">
                units: {sourcePortfolio.summary.totalDiversityUnits}
              </p>
            </article>
          </div>

          <div className="overflow-x-auto rounded border border-zinc-200">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-left">
                <tr>
                  <th className="border-b border-zinc-200 px-3 py-2">Source</th>
                  <th className="border-b border-zinc-200 px-3 py-2">Accepted</th>
                  <th className="border-b border-zinc-200 px-3 py-2">Precision Proxy</th>
                  <th className="border-b border-zinc-200 px-3 py-2">Maintenance Burden</th>
                  <th className="border-b border-zinc-200 px-3 py-2">Freshness Contribution</th>
                  <th className="border-b border-zinc-200 px-3 py-2">Diversity Contribution</th>
                  <th className="border-b border-zinc-200 px-3 py-2">Last Accepted</th>
                </tr>
              </thead>
              <tbody>
                {sourcePortfolio.rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-zinc-500" colSpan={7}>
                      No source portfolio rows found.
                    </td>
                  </tr>
                )}
                {sourcePortfolio.rows.map((row) => (
                  <tr key={row.sourceKey}>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      <p className="font-medium">{row.displayName}</p>
                      <p className="text-xs text-zinc-600">
                        {row.sourceKey} • {row.state}
                        {row.approvedForProd ? "" : " • not approved"}
                      </p>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      <p>{row.acceptedIdeas}</p>
                      <p className="text-xs text-zinc-600">
                        {row.acceptedIdeasLast7d} in last 7d
                      </p>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      <p>{formatPercent(row.precisionProxy)}</p>
                      <p className="text-xs text-zinc-600">
                        {row.acceptedIdeas} / {row.inboxedCandidates}
                      </p>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      <p>{formatPercent(row.maintenanceFailureRate)}</p>
                      <p className="text-xs text-zinc-600">
                        {row.failedRuns + row.partialRuns}/{row.runCount} partial+failed runs •{" "}
                        {row.failedPages} failed pages
                      </p>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      {formatPercent(row.freshnessContribution)}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      <p>{formatPercent(row.diversityContribution)}</p>
                      <p className="text-xs text-zinc-600">{row.diversityUnits} units</p>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      {formatDateTime(row.lastAcceptedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="space-y-3 rounded border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold">Label Quality Dashboard</h4>
                <p className="text-xs text-zinc-600">
                  Editorial quality KPIs by source and extraction strategy.
                </p>
              </div>
              <p className="text-xs text-zinc-500">
                Generated: {formatDateTime(labelQualityAnalytics.generatedAt)}
              </p>
            </div>

            {selectedLabelTrend && (
              <div className="grid gap-3 md:grid-cols-5">
                <article className="rounded border border-zinc-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Reviewed Labels</p>
                  <p className="mt-1 text-2xl font-semibold">{selectedLabelTrend.reviewedLabels}</p>
                  <p className="text-xs text-zinc-600">
                    last {selectedLabelTrend.windowDays}d
                  </p>
                </article>
                <article className="rounded border border-zinc-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Promotion Rate</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatPercent(selectedLabelTrend.promotionRate)}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {selectedLabelTrend.promotedLabels + selectedLabelTrend.promotedAfterEditLabels}/
                    {selectedLabelTrend.reviewedLabels}
                  </p>
                </article>
                <article className="rounded border border-zinc-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Rejection Rate</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatPercent(selectedLabelTrend.rejectionRate)}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {selectedLabelTrend.rejectedLabels}/{selectedLabelTrend.reviewedLabels}
                  </p>
                </article>
                <article className="rounded border border-zinc-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Duplicate Confirmed
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatPercent(selectedLabelTrend.duplicateConfirmedRate)}
                  </p>
                </article>
                <article className="rounded border border-zinc-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Heavy Rewrite Share</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatPercent(selectedLabelTrend.heavyRewriteShare)}
                  </p>
                </article>
              </div>
            )}

            <div className="overflow-x-auto rounded border border-zinc-200">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-zinc-100 text-left">
                  <tr>
                    <th className="border-b border-zinc-200 px-3 py-2">Window</th>
                    <th className="border-b border-zinc-200 px-3 py-2">Reviewed</th>
                    <th className="border-b border-zinc-200 px-3 py-2">Promotion Rate</th>
                    <th className="border-b border-zinc-200 px-3 py-2">Rejection Rate</th>
                    <th className="border-b border-zinc-200 px-3 py-2">Duplicate Confirmed</th>
                    <th className="border-b border-zinc-200 px-3 py-2">Heavy Rewrite Share</th>
                    <th className="border-b border-zinc-200 px-3 py-2">Top Reject Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {labelQualityAnalytics.trendRows.map((row) => (
                    <tr key={row.windowDays}>
                      <td className="border-b border-zinc-100 px-3 py-2">
                        <p className="font-medium">Last {row.windowDays} days</p>
                        <p className="text-xs text-zinc-600">from {formatDateTime(row.windowStartAt)}</p>
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2">{row.reviewedLabels}</td>
                      <td className="border-b border-zinc-100 px-3 py-2">
                        {formatPercent(row.promotionRate)}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2">
                        {formatPercent(row.rejectionRate)}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2">
                        {formatPercent(row.duplicateConfirmedRate)}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2">
                        {formatPercent(row.heavyRewriteShare)}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 text-xs text-zinc-600">
                        {row.topRejectReasons.length === 0
                          ? "-"
                          : row.topRejectReasons
                              .map((reason) => `${reason.code} (${reason.count})`)
                              .join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-zinc-100 text-left">
                    <tr>
                      <th className="border-b border-zinc-200 px-3 py-2">Source</th>
                      <th className="border-b border-zinc-200 px-3 py-2">Reviewed</th>
                      <th className="border-b border-zinc-200 px-3 py-2">Promotion</th>
                      <th className="border-b border-zinc-200 px-3 py-2">Rejection</th>
                      <th className="border-b border-zinc-200 px-3 py-2">Heavy Rewrite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labelQualityAnalytics.sourceRows.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-center text-zinc-500" colSpan={5}>
                          No label rows in selected window.
                        </td>
                      </tr>
                    )}
                    {labelQualityAnalytics.sourceRows.slice(0, 20).map((row) => (
                      <tr key={row.sourceKey}>
                        <td className="border-b border-zinc-100 px-3 py-2">
                          <p className="font-medium">{row.displayName}</p>
                          <p className="text-xs text-zinc-600">
                            {row.sourceKey} • {row.state}
                          </p>
                        </td>
                        <td className="border-b border-zinc-100 px-3 py-2">{row.reviewedLabels}</td>
                        <td className="border-b border-zinc-100 px-3 py-2">
                          {formatPercent(row.promotionRate)}
                        </td>
                        <td className="border-b border-zinc-100 px-3 py-2">
                          <p>{formatPercent(row.rejectionRate)}</p>
                          <p className="text-xs text-zinc-600">{row.topRejectReasonCode ?? "-"}</p>
                        </td>
                        <td className="border-b border-zinc-100 px-3 py-2">
                          {formatPercent(row.heavyRewriteShare)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-zinc-100 text-left">
                    <tr>
                      <th className="border-b border-zinc-200 px-3 py-2">Strategy</th>
                      <th className="border-b border-zinc-200 px-3 py-2">Reviewed</th>
                      <th className="border-b border-zinc-200 px-3 py-2">Promotion</th>
                      <th className="border-b border-zinc-200 px-3 py-2">Rejection</th>
                      <th className="border-b border-zinc-200 px-3 py-2">Duplicate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labelQualityAnalytics.strategyRows.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-center text-zinc-500" colSpan={5}>
                          No strategy slices in selected window.
                        </td>
                      </tr>
                    )}
                    {labelQualityAnalytics.strategyRows.map((row) => (
                      <tr key={row.strategy}>
                        <td className="border-b border-zinc-100 px-3 py-2">
                          <p className="font-medium">{row.strategy}</p>
                          <p className="text-xs text-zinc-600">{row.sourceCount} sources</p>
                        </td>
                        <td className="border-b border-zinc-100 px-3 py-2">{row.reviewedLabels}</td>
                        <td className="border-b border-zinc-100 px-3 py-2">
                          {formatPercent(row.promotionRate)}
                        </td>
                        <td className="border-b border-zinc-100 px-3 py-2">
                          <p>{formatPercent(row.rejectionRate)}</p>
                          <p className="text-xs text-zinc-600">{row.topRejectReasonCode ?? "-"}</p>
                        </td>
                        <td className="border-b border-zinc-100 px-3 py-2">
                          {formatPercent(row.duplicateConfirmedRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded border border-zinc-200 bg-zinc-50 p-3">
            <div>
              <h4 className="text-sm font-semibold">Source Lifecycle Review</h4>
              <p className="text-xs text-zinc-600">
                Reactivate paused/degraded sources after review, or retire sources with archival
                notes. Retired sources are terminal.
              </p>
            </div>
            {!canGovernSources && (
              <p className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
                You have read-only access. Admin role is required for source lifecycle actions.
              </p>
            )}
            {canGovernSources && (
              <div className="grid gap-3 lg:grid-cols-2">
                <form action={reactivateSourceAction} className="space-y-2 rounded border border-zinc-200 bg-white p-3">
                  <h5 className="text-sm font-medium">Reactivate Source</h5>
                  <p className="text-xs text-zinc-600">
                    Allowed states: paused, degraded.
                  </p>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Source</span>
                    <select
                      name="source_key"
                      className="w-full rounded border border-zinc-300 px-3 py-2"
                      defaultValue={source || ""}
                      required
                    >
                      <option value="" disabled>
                        Select source
                      </option>
                      {reactivatableSources.map((row) => (
                        <option key={row.sourceKey} value={row.sourceKey}>
                          {row.displayName} ({row.sourceKey})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Review reason</span>
                    <textarea
                      name="reason"
                      rows={3}
                      className="w-full rounded border border-zinc-300 px-3 py-2"
                      placeholder="Why this source is safe and ready to return to active."
                      required
                    />
                  </label>
                  <label className="flex items-start gap-2 text-xs text-zinc-700">
                    <input type="checkbox" name="product_owner_approved" required className="mt-0.5" />
                    Product owner approval confirmed
                  </label>
                  <label className="flex items-start gap-2 text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      name="compliance_acknowledged"
                      required
                      className="mt-0.5"
                    />
                    Compliance acknowledgment confirmed
                  </label>
                  <button
                    type="submit"
                    disabled={reactivatableSources.length === 0}
                    className="rounded border border-zinc-300 px-3 py-2 text-sm hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reactivate
                  </button>
                </form>

                <form action={retireSourceAction} className="space-y-2 rounded border border-zinc-200 bg-white p-3">
                  <h5 className="text-sm font-medium">Retire Source</h5>
                  <p className="text-xs text-zinc-600">
                    Allowed states: active, degraded, paused.
                  </p>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Source</span>
                    <select
                      name="source_key"
                      className="w-full rounded border border-zinc-300 px-3 py-2"
                      defaultValue={source || ""}
                      required
                    >
                      <option value="" disabled>
                        Select source
                      </option>
                      {retireableSources.map((row) => (
                        <option key={row.sourceKey} value={row.sourceKey}>
                          {row.displayName} ({row.sourceKey})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Retirement reason</span>
                    <textarea
                      name="reason"
                      rows={3}
                      className="w-full rounded border border-zinc-300 px-3 py-2"
                      placeholder="Why this source should be permanently retired."
                      required
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Archival reference (optional)</span>
                    <input
                      name="archival_reference"
                      className="w-full rounded border border-zinc-300 px-3 py-2"
                      placeholder="Ticket, document, or storage path"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Archival summary (optional)</span>
                    <textarea
                      name="archival_summary"
                      rows={2}
                      className="w-full rounded border border-zinc-300 px-3 py-2"
                      placeholder="Short note on archival or follow-up actions"
                    />
                  </label>
                  <label className="flex items-start gap-2 text-xs text-zinc-700">
                    <input type="checkbox" name="product_owner_approved" required className="mt-0.5" />
                    Product owner approval confirmed
                  </label>
                  <label className="flex items-start gap-2 text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      name="compliance_acknowledged"
                      required
                      className="mt-0.5"
                    />
                    Compliance acknowledgment confirmed
                  </label>
                  <button
                    type="submit"
                    disabled={retireableSources.length === 0}
                    className="rounded border border-zinc-300 px-3 py-2 text-sm hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Retire
                  </button>
                </form>
              </div>
            )}
          </section>
        </section>

        <p className="text-sm text-zinc-600">Showing {candidates.length} candidates.</p>

        <div className="overflow-x-auto rounded border border-zinc-300 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-zinc-100 text-left">
              <tr>
                <th className="border-b border-zinc-200 px-3 py-2">Title</th>
                <th className="border-b border-zinc-200 px-3 py-2">Source</th>
                <th className="border-b border-zinc-200 px-3 py-2">Status</th>
                <th className="border-b border-zinc-200 px-3 py-2">Confidence</th>
                <th className="border-b border-zinc-200 px-3 py-2">Duplicate risk</th>
                <th className="border-b border-zinc-200 px-3 py-2">Updated</th>
                <th className="border-b border-zinc-200 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-zinc-500" colSpan={7}>
                    No candidates found.
                  </td>
                </tr>
              )}
              {candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td className="border-b border-zinc-100 px-3 py-2">
                    <div className="space-y-1">
                      <p>{candidate.title}</p>
                      {candidate.description && (
                        <p className="line-clamp-2 text-xs text-zinc-600">
                          {candidate.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="border-b border-zinc-100 px-3 py-2">{candidate.sourceKey}</td>
                  <td className="border-b border-zinc-100 px-3 py-2">{candidate.status}</td>
                  <td className="border-b border-zinc-100 px-3 py-2">
                    {candidate.confidenceBand}
                    {candidate.qualityScore !== null && (
                      <span className="ml-1 text-xs text-zinc-500">
                        ({candidate.qualityScore.toFixed(3)})
                      </span>
                    )}
                  </td>
                  <td className="border-b border-zinc-100 px-3 py-2">{candidate.duplicateRisk}</td>
                  <td className="border-b border-zinc-100 px-3 py-2">
                    {formatDateTime(candidate.updatedAt)}
                  </td>
                  <td className="border-b border-zinc-100 px-3 py-2 text-right">
                    <Link
                      href={`/studio/ingestion/${candidate.id}`}
                      className="rounded border border-zinc-300 px-3 py-1 text-xs hover:border-zinc-600"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </StudioShell>
  );
}
