import type { IngestPage } from "../durable-store/repository.js"

export const STRATEGY_SELECTION_VERSION = "ing031_v1"

export const INGEST_STRATEGIES = [
  "api",
  "feed",
  "sitemap_html",
  "pdf",
  "ics",
  "headless",
] as const

export type IngestStrategy = (typeof INGEST_STRATEGIES)[number]

export interface StrategySelectionInput {
  sourceKey: string
  configuredOrder: string[]
  discoveredUrls: string[]
  metadataJson: Record<string, unknown>
  legalRiskLevel?: string | null
}

export interface StrategyScoreBreakdown {
  strategy: IngestStrategy
  score: number
  configuredPreference: number
  availability: number
  reliability: number
  runtimeCost: number
  legalRisk: number
  matchingUrlCount: number
}

export interface StrategySelectionPlan {
  configuredOrder: IngestStrategy[]
  rankedOrder: IngestStrategy[]
  selectedPrimary: IngestStrategy
  scores: StrategyScoreBreakdown[]
  reasoning: string[]
}

export type StrategyAttemptStatus =
  | "no_pages"
  | "failed"
  | "partial"
  | "success"
  | "no_candidates"

export interface StrategyExecutionAttempt {
  strategy: IngestStrategy
  status: StrategyAttemptStatus
  pagesConsidered: number
  pagesSucceeded: number
  pagesFailed: number
  candidateCount: number
  curatedCandidateCount: number
  qualityFilteredCandidateCount: number
  startedAt: string
  finishedAt: string
  durationMs: number
  fallbackReason?: string | null
}

const DEFAULT_ORDER: IngestStrategy[] = ["sitemap_html"]
const ROLLING_ALPHA = 0.2

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

const smoothRate = (prior: number | null, current: number): number => {
  if (prior === null) return clamp(current, 0, 1)
  return clamp(prior * (1 - ROLLING_ALPHA) + current * ROLLING_ALPHA, 0, 1)
}

export const normalizeStrategyOrder = (configuredOrder: string[]): IngestStrategy[] => {
  const deduped = new Set<IngestStrategy>()
  for (const entry of configuredOrder) {
    if ((INGEST_STRATEGIES as readonly string[]).includes(entry)) {
      deduped.add(entry as IngestStrategy)
    }
  }

  const normalized = [...deduped]
  return normalized.length > 0 ? normalized : [...DEFAULT_ORDER]
}

const classifyUrl = (url: string): {
  isApi: boolean
  isFeed: boolean
  isPdf: boolean
  isIcs: boolean
  isSitemapXml: boolean
} => {
  const parsed = new URL(url)
  const pathname = parsed.pathname.toLowerCase()

  const isApi =
    /(?:^|\/)(api|v1|v2|graphql)(?:\/|$)/i.test(pathname) || /\.json$/i.test(pathname)
  const isSitemapXml = /\/sitemap(?:[_-].+)?\.xml$/i.test(pathname)
  const isFeed =
    !isSitemapXml &&
    (/\/(feed|rss|atom)(?:\/|$)/i.test(pathname) || /\.(rss|atom|xml)$/i.test(pathname))
  const isPdf = /\.pdf$/i.test(pathname)
  const isIcs = /\.ics$/i.test(pathname)

  return { isApi, isFeed, isPdf, isIcs, isSitemapXml }
}

export const matchesStrategyUrl = (strategy: IngestStrategy, url: string): boolean => {
  const parsed = new URL(url)
  const pathname = parsed.pathname.toLowerCase()
  const classification = classifyUrl(url)

  switch (strategy) {
    case "api":
      return classification.isApi
    case "feed":
      return classification.isFeed
    case "pdf":
      return classification.isPdf
    case "ics":
      return classification.isIcs
    case "sitemap_html":
      return (
        !classification.isApi &&
        !classification.isFeed &&
        !classification.isPdf &&
        !classification.isIcs
      )
    case "headless":
      return (
        !classification.isPdf &&
        !classification.isIcs &&
        !/\.(png|jpg|jpeg|gif|svg|webp|mp4|mp3|zip)$/i.test(pathname)
      )
    default:
      return false
  }
}

export const filterPagesForStrategy = (
  pages: IngestPage[],
  strategy: IngestStrategy
): IngestPage[] => pages.filter((page) => matchesStrategyUrl(strategy, page.url))

const readPriorRates = (
  metadataJson: Record<string, unknown>,
  strategy: IngestStrategy
): { successRate: number; yieldRate: number } => {
  const performance = asRecord(metadataJson.strategy_performance)
  const strategyNode = asRecord(performance[strategy])

  const successRate = clamp(
    asFiniteNumber(strategyNode.rolling_success_rate) ??
      asFiniteNumber(strategyNode.success_rate) ??
      0.5,
    0,
    1
  )

  const yieldRate = clamp(
    asFiniteNumber(strategyNode.rolling_yield_rate) ??
      asFiniteNumber(strategyNode.yield_rate) ??
      0.5,
    0,
    1
  )

  return { successRate, yieldRate }
}

const runtimeCostWeight = (strategy: IngestStrategy): number => {
  switch (strategy) {
    case "api":
      return 0.95
    case "feed":
      return 0.9
    case "ics":
      return 0.88
    case "sitemap_html":
      return 0.75
    case "pdf":
      return 0.6
    case "headless":
      return 0.3
    default:
      return 0.5
  }
}

const legalRiskWeight = (
  strategy: IngestStrategy,
  legalRiskLevel: string | null | undefined
): number => {
  const base = (() => {
    switch (strategy) {
      case "api":
        return 0.85
      case "feed":
        return 0.9
      case "ics":
        return 0.92
      case "sitemap_html":
        return 0.7
      case "pdf":
        return 0.65
      case "headless":
        return 0.35
      default:
        return 0.5
    }
  })()

  const normalized = (legalRiskLevel ?? "medium").toLowerCase()
  const multiplier = normalized === "high" ? 0.7 : normalized === "low" ? 1.05 : 1
  return clamp(base * multiplier, 0, 1)
}

export const selectStrategyPlan = (input: StrategySelectionInput): StrategySelectionPlan => {
  const configuredOrder = normalizeStrategyOrder(input.configuredOrder)
  const metadataJson = asRecord(input.metadataJson)

  const scoreRows: StrategyScoreBreakdown[] = configuredOrder.map((strategy, index) => {
    const matchingUrls = input.discoveredUrls.filter((url) => matchesStrategyUrl(strategy, url))
    const matchingUrlCount = matchingUrls.length
    const availability = clamp(Math.log10(matchingUrlCount + 1) / Math.log10(8), 0, 1)
    const configuredPreference =
      configuredOrder.length <= 1 ? 1 : 1 - index / (configuredOrder.length - 1)

    const priorRates = readPriorRates(metadataJson, strategy)
    const reliability = clamp(priorRates.successRate * 0.7 + priorRates.yieldRate * 0.3, 0, 1)
    const runtimeCost = runtimeCostWeight(strategy)
    const legalRisk = legalRiskWeight(strategy, input.legalRiskLevel)

    let score =
      configuredPreference * 0.35 +
      availability * 0.2 +
      reliability * 0.3 +
      runtimeCost * 0.1 +
      legalRisk * 0.05

    if (matchingUrlCount === 0) {
      score -= 0.15
    }

    return {
      strategy,
      score: clamp(score, 0, 1),
      configuredPreference,
      availability,
      reliability,
      runtimeCost,
      legalRisk,
      matchingUrlCount,
    }
  })

  const rankedOrder = [...scoreRows]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return configuredOrder.indexOf(left.strategy) - configuredOrder.indexOf(right.strategy)
    })
    .map((entry) => entry.strategy)

  const top = scoreRows.find((entry) => entry.strategy === rankedOrder[0]) ?? scoreRows[0]
  const reasoning: string[] = []
  if (top) {
    reasoning.push(
      `Selected primary strategy "${top.strategy}" with score ${top.score.toFixed(
        3
      )} from configured order [${configuredOrder.join(", ")}].`
    )
    reasoning.push(
      `Top strategy signals: matching_urls=${top.matchingUrlCount}, reliability=${top.reliability.toFixed(
        3
      )}, runtime_cost=${top.runtimeCost.toFixed(3)}, legal_risk=${top.legalRisk.toFixed(3)}.`
    )
  }

  return {
    configuredOrder,
    rankedOrder,
    selectedPrimary: rankedOrder[0] ?? configuredOrder[0],
    scores: scoreRows,
    reasoning,
  }
}

export const mergeStrategyPerformanceMetadata = (
  metadataJson: Record<string, unknown>,
  attempts: StrategyExecutionAttempt[]
): Record<string, unknown> => {
  if (attempts.length === 0) {
    return metadataJson
  }

  const mergedMetadata = asRecord(metadataJson)
  const existing = asRecord(mergedMetadata.strategy_performance)
  const next: Record<string, unknown> = { ...existing }

  for (const strategy of INGEST_STRATEGIES) {
    const strategyAttempts = attempts.filter((attempt) => attempt.strategy === strategy)
    if (strategyAttempts.length === 0) {
      continue
    }

    let node = asRecord(next[strategy])
    let attemptsTotal = Math.max(0, Math.round(asFiniteNumber(node.attempts_total) ?? 0))
    let successTotal = Math.max(0, Math.round(asFiniteNumber(node.success_total) ?? 0))
    let failureTotal = Math.max(0, Math.round(asFiniteNumber(node.failure_total) ?? 0))
    let noCandidateTotal = Math.max(0, Math.round(asFiniteNumber(node.no_candidate_total) ?? 0))
    let rollingSuccessRate = clamp(asFiniteNumber(node.rolling_success_rate) ?? 0.5, 0, 1)
    let rollingYieldRate = clamp(asFiniteNumber(node.rolling_yield_rate) ?? 0.5, 0, 1)
    let lastSuccessAt =
      typeof node.last_success_at === "string" ? node.last_success_at : null

    for (const attempt of strategyAttempts) {
      attemptsTotal += 1
      const wasSuccessful = attempt.status === "success" || attempt.status === "partial"
      const hadCandidates = attempt.candidateCount > 0

      if (wasSuccessful) {
        successTotal += 1
        lastSuccessAt = attempt.finishedAt
      } else if (attempt.status === "no_candidates") {
        noCandidateTotal += 1
      } else if (attempt.status === "failed") {
        failureTotal += 1
      }

      rollingSuccessRate = smoothRate(rollingSuccessRate, wasSuccessful ? 1 : 0)
      rollingYieldRate = smoothRate(rollingYieldRate, hadCandidates ? 1 : 0)

      node = {
        ...node,
        attempts_total: attemptsTotal,
        success_total: successTotal,
        failure_total: failureTotal,
        no_candidate_total: noCandidateTotal,
        rolling_success_rate: Number(rollingSuccessRate.toFixed(5)),
        rolling_yield_rate: Number(rollingYieldRate.toFixed(5)),
        last_status: attempt.status,
        last_attempt_at: attempt.finishedAt,
        last_success_at: lastSuccessAt,
        last_candidate_count: attempt.candidateCount,
        last_pages_considered: attempt.pagesConsidered,
        updated_at: attempt.finishedAt,
      }
    }

    next[strategy] = node
  }

  return {
    ...mergedMetadata,
    strategy_performance: next,
  }
}
