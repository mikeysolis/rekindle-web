import { createServiceRoleClient } from "../clients/supabase.js"
import { assertIngestConfig, loadConfig } from "../config/env.js"
import { createLogger } from "../core/logger.js"
import {
  DurableStoreRepository,
  type SourceOnboardingApprovalAction,
  type SourceOnboardingFetchStatus,
  type SourceOnboardingProbeStatus,
} from "../durable-store/repository.js"

const REQUEST_HEADERS = {
  "user-agent": "rekindle-pipeline/0.1 (+https://rekindle.app)",
}

const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_MAX_PROBE_PAGES = 6
const PROBE_VERSION = "ing030_v1"

const SOURCE_REGISTRY_STRATEGIES = [
  "api",
  "feed",
  "sitemap_html",
  "pdf",
  "ics",
  "headless",
] as const

const LISTING_PATH_HINTS = [
  "idea",
  "ideas",
  "campaign",
  "calendar",
  "event",
  "events",
  "practice",
  "resource",
  "resources",
  "tips",
  "kindness",
  "guide",
  "guides",
]

const DYNAMIC_HINTS = [
  "__NEXT_DATA__",
  "data-reactroot",
  "webpack",
  "hydration",
  "window.__INITIAL_STATE__",
  "ng-app",
  "id=\"app\"",
]

export type ProbeStrategy = (typeof SOURCE_REGISTRY_STRATEGIES)[number]

export interface SourceProbeOptions {
  sourceKey?: string
  displayName?: string
  ownerTeam?: string
  operatorApprovalAction?: SourceOnboardingApprovalAction
  operatorDecisionReason?: string
  actorUserId?: string
  createProposal?: boolean
  maxProbePages?: number
}

export interface ProbePageArtifact {
  url: string
  ok: boolean
  status: number | null
  contentType: string | null
  durationMs: number
  error: string | null
  links: string[]
  sameOriginLinks: string[]
  dynamicHintCount: number
}

export interface ProbeStructureSummary {
  fetchedPageCount: number
  successfulPageCount: number
  failedPageCount: number
  sameOriginLinkCount: number
  externalLinkCount: number
  listingLinkCount: number
  detailPatternCount: number
  detailPatterns: Array<{ prefix: string; count: number }>
  feedLinkCount: number
  icsLinkCount: number
  pdfLinkCount: number
  apiLinkCount: number
  sitemapHintCount: number
  dynamicHintCount: number
}

export interface ProbeStrategyRecommendation {
  strategyOrder: ProbeStrategy[]
  confidence: number
  scores: Record<ProbeStrategy, number>
  reasoning: string[]
}

export interface SourceProbeResult {
  sourceKey: string
  displayName: string
  inputUrl: string
  rootUrl: string
  sourceDomain: string
  proposalCreated: boolean
  reportId: string | null
  probeStatus: SourceOnboardingProbeStatus
  fetchStatus: SourceOnboardingFetchStatus
  scannedPageCount: number
  successfulPageCount: number
  recommendedStrategyOrder: ProbeStrategy[]
  recommendationConfidence: number
  recommendationReasoning: string[]
  operatorApprovalAction: SourceOnboardingApprovalAction
  warnings: string[]
}

interface LinkClassification {
  isFeed: boolean
  isIcs: boolean
  isPdf: boolean
  isApi: boolean
  isListing: boolean
  detailPrefix: string | null
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

const sanitizeSourceKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

const buildDisplayNameFromSourceKey = (sourceKey: string): string =>
  sourceKey
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

export const normalizeProbeInput = (input: string): URL => {
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    throw new Error("source-probe input cannot be empty")
  }

  const prefixed = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const parsed = new URL(prefixed)
  parsed.hash = ""

  if (parsed.pathname.length === 0) {
    parsed.pathname = "/"
  }

  return parsed
}

export const deriveSourceKeyFromInput = (inputUrl: URL): string => {
  const hostWithoutWww = inputUrl.hostname.replace(/^www\./i, "")
  const hostKey = sanitizeSourceKey(hostWithoutWww)
  return hostKey.length > 0 ? hostKey : "source_probe"
}

const parseSitemapHintsFromRobots = (content: string): string[] => {
  const hints: string[] = []

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*sitemap\s*:\s*(\S+)/i)
    if (!match?.[1]) continue
    hints.push(match[1].trim())
  }

  return [...new Set(hints)]
}

const extractLocUrlsFromSitemapXml = (content: string): string[] => {
  const urls: string[] = []

  for (const match of content.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    const value = match[1]?.trim()
    if (!value) continue
    urls.push(value)
  }

  return [...new Set(urls)]
}

export const extractLinksFromHtml = (html: string, baseUrl: string): string[] => {
  const links = new Set<string>()
  const hrefPattern = /(?:href|src)=["']([^"']+)["']/gi

  for (const match of html.matchAll(hrefPattern)) {
    const raw = match[1]
    if (!raw) continue

    try {
      const absolute = new URL(raw, baseUrl)
      if (!["http:", "https:"].includes(absolute.protocol)) {
        continue
      }
      absolute.hash = ""
      links.add(absolute.toString())
    } catch {
      continue
    }
  }

  return [...links]
}

const countDynamicHints = (html: string): number => {
  const normalized = html.toLowerCase()
  return DYNAMIC_HINTS.filter((hint) => normalized.includes(hint.toLowerCase())).length
}

const classifyLink = (url: string): LinkClassification => {
  const parsed = new URL(url)
  const normalizedPath = parsed.pathname.toLowerCase()

  const isIcs = /\.ics$/i.test(normalizedPath)
  const isPdf = /\.pdf$/i.test(normalizedPath)
  const isFeed =
    /(?:^|\/)(feed|rss|atom)(?:\/|$)/i.test(normalizedPath) || /\.(rss|atom|xml)$/i.test(normalizedPath)
  const isApi =
    /(?:^|\/)(api|v1|v2|graphql)(?:\/|$)/i.test(normalizedPath) || /\.json$/i.test(normalizedPath)

  const pathSegments = normalizedPath.split("/").filter(Boolean)
  const pathForHints = pathSegments.join("/")

  const isListing = LISTING_PATH_HINTS.some((hint) => pathForHints.includes(hint))

  let detailPrefix: string | null = null
  const likelyDetailLeaf = pathSegments.at(-1)

  if (
    pathSegments.length >= 2 &&
    likelyDetailLeaf &&
    /[-\d]/.test(likelyDetailLeaf) &&
    !/\.[a-z0-9]{2,5}$/i.test(likelyDetailLeaf)
  ) {
    detailPrefix = `/${pathSegments.slice(0, 2).join("/")}`
  }

  return {
    isFeed,
    isIcs,
    isPdf,
    isApi,
    isListing,
    detailPrefix,
  }
}

export const summarizeProbeSignals = (params: {
  rootOrigin: string
  pages: ProbePageArtifact[]
  sitemapHints: string[]
}): ProbeStructureSummary => {
  const sameOriginLinks = new Set<string>()
  const externalLinks = new Set<string>()

  let listingLinkCount = 0
  let feedLinkCount = 0
  let icsLinkCount = 0
  let pdfLinkCount = 0
  let apiLinkCount = 0
  let dynamicHintCount = 0

  const detailPrefixCount = new Map<string, number>()

  for (const page of params.pages) {
    dynamicHintCount += page.dynamicHintCount

    for (const link of page.links) {
      const parsed = new URL(link)
      if (parsed.origin === params.rootOrigin) {
        if (sameOriginLinks.has(link)) {
          continue
        }

        sameOriginLinks.add(link)
        const classification = classifyLink(link)

        if (classification.isListing) listingLinkCount += 1
        if (classification.isFeed) feedLinkCount += 1
        if (classification.isIcs) icsLinkCount += 1
        if (classification.isPdf) pdfLinkCount += 1
        if (classification.isApi) apiLinkCount += 1

        if (classification.detailPrefix) {
          detailPrefixCount.set(
            classification.detailPrefix,
            (detailPrefixCount.get(classification.detailPrefix) ?? 0) + 1
          )
        }
      } else {
        externalLinks.add(link)
      }
    }
  }

  const detailPatterns = [...detailPrefixCount.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([prefix, count]) => ({ prefix, count }))

  return {
    fetchedPageCount: params.pages.length,
    successfulPageCount: params.pages.filter((page) => page.ok).length,
    failedPageCount: params.pages.filter((page) => !page.ok).length,
    sameOriginLinkCount: sameOriginLinks.size,
    externalLinkCount: externalLinks.size,
    listingLinkCount,
    detailPatternCount: detailPatterns.length,
    detailPatterns,
    feedLinkCount,
    icsLinkCount,
    pdfLinkCount,
    apiLinkCount,
    sitemapHintCount: params.sitemapHints.length,
    dynamicHintCount,
  }
}

export const recommendStrategyOrder = (
  summary: ProbeStructureSummary
): ProbeStrategyRecommendation => {
  const scores: Record<ProbeStrategy, number> = {
    api: 0,
    feed: 0,
    sitemap_html: 0,
    pdf: 0,
    ics: 0,
    headless: 0,
  }

  scores.api += summary.apiLinkCount * 2
  scores.feed += summary.feedLinkCount * 2 + summary.sitemapHintCount * 0.5
  scores.ics += summary.icsLinkCount * 2.5
  scores.pdf += summary.pdfLinkCount * 2.2
  scores.sitemap_html +=
    summary.listingLinkCount * 1.2 +
    summary.detailPatternCount * 2 +
    summary.sitemapHintCount * 1.3 +
    (summary.sameOriginLinkCount > 0 ? 1 : 0)
  scores.headless += summary.dynamicHintCount * 1.8 + (summary.successfulPageCount === 0 ? 2 : 0)

  const ranked = [...SOURCE_REGISTRY_STRATEGIES].sort((left, right) => {
    if (scores[right] !== scores[left]) {
      return scores[right] - scores[left]
    }
    return SOURCE_REGISTRY_STRATEGIES.indexOf(left) - SOURCE_REGISTRY_STRATEGIES.indexOf(right)
  })

  const positive = ranked.filter((strategy) => scores[strategy] > 0)
  const strategyOrder = [...positive, ...SOURCE_REGISTRY_STRATEGIES.filter((entry) => !positive.includes(entry))]

  const topScore = Math.max(...Object.values(scores))
  const nonZeroStrategyCount = Object.values(scores).filter((score) => score > 0).length
  const coverage =
    summary.fetchedPageCount > 0 ? summary.successfulPageCount / summary.fetchedPageCount : 0
  const failurePenalty =
    summary.fetchedPageCount > 0 ? (summary.failedPageCount / summary.fetchedPageCount) * 0.25 : 0

  const rawConfidence =
    0.15 +
    clamp(topScore / 10, 0, 1) * 0.45 +
    clamp(nonZeroStrategyCount / 3, 0, 1) * 0.2 +
    clamp(coverage, 0, 1) * 0.2 +
    clamp(summary.detailPatternCount / 3, 0, 1) * 0.1 -
    failurePenalty

  const confidence = roundTo(clamp(rawConfidence, 0.05, 0.99), 4)

  const reasoning: string[] = []

  if (summary.feedLinkCount > 0) {
    reasoning.push(`Detected ${summary.feedLinkCount} feed-like links.`)
  }

  if (summary.icsLinkCount > 0) {
    reasoning.push(`Detected ${summary.icsLinkCount} ICS links.`)
  }

  if (summary.pdfLinkCount > 0) {
    reasoning.push(`Detected ${summary.pdfLinkCount} PDF links.`)
  }

  if (summary.detailPatternCount > 0) {
    reasoning.push(`Detected ${summary.detailPatternCount} repeated detail path patterns.`)
  }

  if (summary.dynamicHintCount > 0) {
    reasoning.push(`Detected ${summary.dynamicHintCount} dynamic-rendering hints.`)
  }

  if (summary.failedPageCount > 0) {
    reasoning.push(
      `${summary.failedPageCount} pages failed during probe, reducing confidence.`
    )
  }

  if (reasoning.length === 0) {
    reasoning.push("Weak structural evidence; using conservative default strategy ladder.")
  }

  return {
    strategyOrder,
    confidence,
    scores,
    reasoning,
  }
}

const fetchWithTimeout = async (
  url: string,
  timeoutMs: number
): Promise<{
  ok: boolean
  status: number | null
  contentType: string | null
  body: string
  durationMs: number
  error: string | null
}> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      signal: controller.signal,
    })

    const durationMs = Date.now() - startedAt
    const contentType = response.headers.get("content-type")
    const body = await response.text()

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        contentType,
        body,
        durationMs,
        error: `HTTP ${response.status}`,
      }
    }

    return {
      ok: true,
      status: response.status,
      contentType,
      body,
      durationMs,
      error: null,
    }
  } catch (error) {
    const durationMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : String(error)

    return {
      ok: false,
      status: null,
      contentType: null,
      body: "",
      durationMs,
      error: message,
    }
  } finally {
    clearTimeout(timer)
  }
}

const toProbePageArtifact = (params: {
  url: string
  rootOrigin: string
  fetchResult: {
    ok: boolean
    status: number | null
    contentType: string | null
    body: string
    durationMs: number
    error: string | null
  }
}): ProbePageArtifact => {
  const links =
    params.fetchResult.body.length > 0
      ? extractLinksFromHtml(params.fetchResult.body, params.url)
      : []

  const sameOriginLinks = links.filter((link) => {
    try {
      return new URL(link).origin === params.rootOrigin
    } catch {
      return false
    }
  })

  const dynamicHintCount =
    typeof params.fetchResult.contentType === "string" &&
    params.fetchResult.contentType.toLowerCase().includes("html")
      ? countDynamicHints(params.fetchResult.body)
      : 0

  return {
    url: params.url,
    ok: params.fetchResult.ok,
    status: params.fetchResult.status,
    contentType: params.fetchResult.contentType,
    durationMs: params.fetchResult.durationMs,
    error: params.fetchResult.error,
    links,
    sameOriginLinks,
    dynamicHintCount,
  }
}

const isLikelyListingLink = (url: string): boolean => {
  const parsed = new URL(url)
  const path = parsed.pathname.toLowerCase()

  if (/\.(pdf|ics|png|jpg|jpeg|gif|svg|xml|json)$/i.test(path)) {
    return false
  }

  return LISTING_PATH_HINTS.some((hint) => path.includes(hint)) || path === "/" || path.length <= 2
}

const clampProbePages = (value: number | undefined): number => {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_MAX_PROBE_PAGES
  }

  return Math.round(clamp(value, 2, 12))
}

export async function sourceProbe(
  input: string,
  options: SourceProbeOptions = {}
): Promise<SourceProbeResult> {
  const config = loadConfig()
  assertIngestConfig(config)

  const rootInputUrl = normalizeProbeInput(input)
  const rootOriginUrl = new URL(rootInputUrl.origin)
  rootOriginUrl.pathname = "/"
  rootOriginUrl.search = ""
  rootOriginUrl.hash = ""
  const rootUrl = rootOriginUrl.toString()

  const sourceKey = options.sourceKey
    ? sanitizeSourceKey(options.sourceKey)
    : deriveSourceKeyFromInput(rootInputUrl)

  if (sourceKey.length === 0) {
    throw new Error("Unable to derive source key from input. Provide --source-key.")
  }

  const displayName =
    options.displayName?.trim() && options.displayName.trim().length > 0
      ? options.displayName.trim()
      : buildDisplayNameFromSourceKey(sourceKey)

  const ownerTeam = options.ownerTeam?.trim() || "ingestion"
  const operatorApprovalAction = options.operatorApprovalAction ?? "pending_review"
  const shouldCreateProposal = options.createProposal !== false

  const logger = createLogger(config.logLevel, `source-probe:${sourceKey}`)
  const ingestClient = createServiceRoleClient(
    config.ingestSupabaseUrl,
    config.ingestSupabaseServiceRoleKey
  )
  const durable = new DurableStoreRepository(ingestClient, logger)

  const pages: ProbePageArtifact[] = []
  const warnings: string[] = []
  const visited = new Set<string>()
  const queued = new Set<string>()
  const queue: string[] = []
  const sitemapHints = new Set<string>()

  const enqueue = (url: string): void => {
    if (visited.has(url) || queued.has(url)) return
    queued.add(url)
    queue.push(url)
  }

  enqueue(rootUrl)

  const maxProbePages = clampProbePages(options.maxProbePages)

  while (queue.length > 0 && pages.length < maxProbePages) {
    const nextUrl = queue.shift()
    if (!nextUrl) continue
    queued.delete(nextUrl)

    if (visited.has(nextUrl)) continue
    visited.add(nextUrl)

    const fetchResult = await fetchWithTimeout(nextUrl, DEFAULT_TIMEOUT_MS)
    const page = toProbePageArtifact({
      url: nextUrl,
      rootOrigin: rootOriginUrl.origin,
      fetchResult,
    })

    pages.push(page)

    if (!page.ok) {
      logger.warn("Probe page fetch failed", {
        sourceKey,
        url: nextUrl,
        error: page.error,
        status: page.status,
      })
      continue
    }

    const contentType = (page.contentType ?? "").toLowerCase()
    const isRobots = nextUrl.endsWith("/robots.txt")
    const isSitemap = /\/sitemap(?:[_-].+)?\.xml$/i.test(new URL(nextUrl).pathname)

    if (isRobots) {
      for (const hint of parseSitemapHintsFromRobots(fetchResult.body)) {
        sitemapHints.add(hint)
      }
      continue
    }

    if (isSitemap || contentType.includes("xml")) {
      for (const hint of extractLocUrlsFromSitemapXml(fetchResult.body).slice(0, 50)) {
        sitemapHints.add(hint)
      }
      continue
    }

    for (const link of page.sameOriginLinks) {
      if (isLikelyListingLink(link)) {
        enqueue(link)
      }
    }
  }

  const robotsUrl = `${rootOriginUrl.origin}/robots.txt`
  if (!visited.has(robotsUrl) && pages.length < maxProbePages) {
    const robotsFetch = await fetchWithTimeout(robotsUrl, DEFAULT_TIMEOUT_MS)
    const robotsPage = toProbePageArtifact({
      url: robotsUrl,
      rootOrigin: rootOriginUrl.origin,
      fetchResult: robotsFetch,
    })
    pages.push(robotsPage)

    if (robotsFetch.ok) {
      for (const hint of parseSitemapHintsFromRobots(robotsFetch.body)) {
        sitemapHints.add(hint)
      }
    }
  }

  const defaultSitemapUrl = `${rootOriginUrl.origin}/sitemap.xml`
  if (sitemapHints.size === 0) {
    sitemapHints.add(defaultSitemapUrl)
  }

  const sitemapFetchTargets = [...sitemapHints].slice(0, 2)
  for (const sitemapUrl of sitemapFetchTargets) {
    if (visited.has(sitemapUrl) || pages.length >= maxProbePages) {
      continue
    }

    const sitemapFetch = await fetchWithTimeout(sitemapUrl, DEFAULT_TIMEOUT_MS)
    const sitemapPage = toProbePageArtifact({
      url: sitemapUrl,
      rootOrigin: rootOriginUrl.origin,
      fetchResult: sitemapFetch,
    })

    pages.push(sitemapPage)
    visited.add(sitemapUrl)

    if (sitemapFetch.ok) {
      for (const hint of extractLocUrlsFromSitemapXml(sitemapFetch.body).slice(0, 25)) {
        sitemapHints.add(hint)
      }
    }
  }

  const summary = summarizeProbeSignals({
    rootOrigin: rootOriginUrl.origin,
    pages,
    sitemapHints: [...sitemapHints],
  })

  const recommendation = recommendStrategyOrder(summary)

  const fetchStatus: SourceOnboardingFetchStatus =
    summary.failedPageCount === 0
      ? "ok"
      : summary.successfulPageCount > 0
        ? "partial"
        : "failed"

  const probeStatus: SourceOnboardingProbeStatus =
    summary.successfulPageCount > 0 ? "completed" : "failed"

  let proposalCreated = false

  if (shouldCreateProposal) {
    try {
      const proposal = await durable.ensureSourceRegistryProposal({
        sourceKey,
        displayName,
        sourceDomain: rootOriginUrl.hostname,
        rootUrl,
        ownerTeam,
        recommendedStrategyOrder: recommendation.strategyOrder,
      })
      proposalCreated = proposal.created
    } catch (error) {
      warnings.push(
        `Failed to create source proposal: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  const evidenceJson: Record<string, unknown> = {
    probe_version: PROBE_VERSION,
    input_url: rootInputUrl.toString(),
    root_url: rootUrl,
    source_domain: rootOriginUrl.hostname,
    scanned_pages: pages.map((page) => ({
      url: page.url,
      ok: page.ok,
      status: page.status,
      content_type: page.contentType,
      duration_ms: page.durationMs,
      error: page.error,
      link_count: page.links.length,
      same_origin_link_count: page.sameOriginLinks.length,
      dynamic_hint_count: page.dynamicHintCount,
      sample_links: page.links.slice(0, 10),
    })),
    sitemap_hints: [...sitemapHints].slice(0, 25),
    structure_summary: summary,
    recommendation: {
      strategy_order: recommendation.strategyOrder,
      confidence: recommendation.confidence,
      scores: recommendation.scores,
      reasoning: recommendation.reasoning,
    },
  }

  let reportId: string | null = null

  try {
    const report = await durable.createSourceOnboardingReport({
      sourceKey,
      inputUrl: rootInputUrl.toString(),
      rootUrl,
      sourceDomain: rootOriginUrl.hostname,
      probeStatus,
      fetchStatus,
      recommendedStrategyOrder: recommendation.strategyOrder,
      recommendationConfidence: recommendation.confidence,
      operatorApprovalAction,
      operatorDecisionReason: options.operatorDecisionReason ?? null,
      actorUserId: options.actorUserId ?? null,
      decidedAt: operatorApprovalAction === "pending_review" ? null : new Date().toISOString(),
      evidenceJson,
    })

    reportId = report.id
  } catch (error) {
    warnings.push(
      `Failed to persist onboarding report: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return {
    sourceKey,
    displayName,
    inputUrl: rootInputUrl.toString(),
    rootUrl,
    sourceDomain: rootOriginUrl.hostname,
    proposalCreated,
    reportId,
    probeStatus,
    fetchStatus,
    scannedPageCount: summary.fetchedPageCount,
    successfulPageCount: summary.successfulPageCount,
    recommendedStrategyOrder: recommendation.strategyOrder,
    recommendationConfidence: recommendation.confidence,
    recommendationReasoning: recommendation.reasoning,
    operatorApprovalAction,
    warnings,
  }
}
