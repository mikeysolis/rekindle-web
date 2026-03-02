import type {
  DiscoveredPage,
  ExtractedCandidate,
  SourceHealthCheckResult,
  SourceModule,
  SourceModuleContext,
} from "../../core/types.js"
import {
  BASE_DOMAIN,
  MAX_DETAIL_CANDIDATES,
  MAX_DISCOVERED_URLS,
  SOURCE_KEY,
  buildCandidateFromDetailPage,
  classifyRakUrl,
  extractCandidatesFromListingPage,
  extractDetailLinksFromHtml,
  normalizeRakUrl,
} from "./parser.js"

const SEED_URLS = [`${BASE_DOMAIN}/kindness-ideas`]

const REQUEST_HEADERS = {
  "user-agent": "rekindle-pipeline/0.1 (+https://rekindle.app)",
}

const MAX_DISCOVERY_FETCHES = 24

const fetchPage = async (url: string): Promise<string> => {
  const response = await fetch(url, { headers: REQUEST_HEADERS })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`)
  }
  return response.text()
}

const discover = async (ctx: SourceModuleContext): Promise<DiscoveredPage[]> => {
  const queue = [...SEED_URLS.map(normalizeRakUrl)]
  const queued = new Set(queue)
  const visited = new Set<string>()
  const detailPages = new Set<string>()

  while (
    queue.length > 0 &&
    visited.size < MAX_DISCOVERY_FETCHES &&
    detailPages.size < MAX_DISCOVERED_URLS
  ) {
    const currentUrl = queue.shift()
    if (!currentUrl) continue

    const normalizedCurrentUrl = normalizeRakUrl(currentUrl)
    if (visited.has(normalizedCurrentUrl)) continue
    visited.add(normalizedCurrentUrl)

    try {
      const html = await fetchPage(normalizedCurrentUrl)
      const detailLinks = extractDetailLinksFromHtml(html, normalizedCurrentUrl)

      for (const detailLink of detailLinks) {
        detailPages.add(detailLink)

        if (!queued.has(detailLink) && !visited.has(detailLink) && queue.length < MAX_DISCOVERED_URLS) {
          queued.add(detailLink)
          queue.push(detailLink)
        }
      }
    } catch (error) {
      ctx.logger.warn("RAK discovery fetch failed", {
        url: normalizedCurrentUrl,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (detailPages.size === 0) {
    return SEED_URLS.map((url) => ({ sourceKey: SOURCE_KEY, url: normalizeRakUrl(url) }))
  }

  return [...detailPages].slice(0, MAX_DISCOVERED_URLS).map((url) => ({
    sourceKey: SOURCE_KEY,
    url: normalizeRakUrl(url),
  }))
}

const dedupeCandidates = (candidates: ExtractedCandidate[]): ExtractedCandidate[] => {
  const seen = new Set<string>()
  const deduped: ExtractedCandidate[] = []

  for (const candidate of candidates) {
    const key = `${candidate.sourceUrl}::${candidate.title.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(candidate)
  }

  return deduped
}

const extract = async (
  _ctx: SourceModuleContext,
  page: DiscoveredPage
): Promise<ExtractedCandidate[]> => {
  const normalizedPageUrl = normalizeRakUrl(page.url)
  const html = await fetchPage(normalizedPageUrl)
  const classification = classifyRakUrl(normalizedPageUrl)

  if (classification === "detail") {
    const candidate = buildCandidateFromDetailPage(normalizedPageUrl, html)
    return candidate ? [candidate].slice(0, MAX_DETAIL_CANDIDATES) : []
  }

  if (classification === "listing") {
    const candidates = extractCandidatesFromListingPage(normalizedPageUrl, html)
      .filter((candidate) => normalizeRakUrl(candidate.sourceUrl) !== normalizedPageUrl)
      .map((candidate) => ({ ...candidate, sourceUrl: normalizeRakUrl(candidate.sourceUrl) }))

    return dedupeCandidates(candidates)
  }

  return []
}

const healthCheck = async (ctx: SourceModuleContext): Promise<SourceHealthCheckResult> => {
  const invalidSeedUrls = SEED_URLS.filter(
    (seedUrl) => classifyRakUrl(normalizeRakUrl(seedUrl)) !== "listing"
  )

  return {
    status: invalidSeedUrls.length > 0 ? "degraded" : "ok",
    checkedAt: new Date().toISOString(),
    diagnostics: {
      source_key: SOURCE_KEY,
      seed_urls: SEED_URLS,
      invalid_seed_urls: invalidSeedUrls,
      max_discovery_fetches: MAX_DISCOVERY_FETCHES,
      extractor_version: "rak_parser_v2",
      default_locale: ctx.defaultLocale,
    },
  }
}

export const createRakSource = (): SourceModule => ({
  key: SOURCE_KEY,
  displayName: "Random Acts of Kindness",
  discover,
  extract,
  healthCheck,
})
