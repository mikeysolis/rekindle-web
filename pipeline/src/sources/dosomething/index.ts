import type {
  DiscoveredPage,
  ExtractedCandidate,
  SourceHealthCheckResult,
  SourceModule,
  SourceModuleContext,
} from "../../core/types.js"
import { htmlToText } from "../../core/html.js"

const SOURCE_KEY = "dosomething"
const BASE_DOMAIN = "https://www.dosomething.org"
const SEED_URLS = [`${BASE_DOMAIN}/us/campaigns`]
const MAX_DISCOVERED_URLS = 80
const MAX_DISCOVERY_FETCHES = 12

const REQUEST_HEADERS = {
  "user-agent": "rekindle-pipeline/0.1 (+https://rekindle.app)",
}

const DETAIL_PAGE_PATTERN = /^\/us\/campaigns\/[a-z0-9-]+\/?$/i
const LISTING_PAGE_PATTERN = /^\/us\/campaigns(?:\/|$)/i
const ACTION_STARTERS = new Set([
  "add",
  "ask",
  "build",
  "call",
  "check",
  "create",
  "do",
  "donate",
  "give",
  "help",
  "join",
  "make",
  "offer",
  "plan",
  "share",
  "start",
  "take",
  "teach",
  "try",
  "visit",
  "volunteer",
  "write",
])

const unique = <T>(items: T[]): T[] => [...new Set(items)]

const toAbsoluteUrl = (href: string, baseUrl: string): string | null => {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeUrl = (value: string): string => {
  const parsed = new URL(value)
  parsed.hash = ""
  if (DETAIL_PAGE_PATTERN.test(parsed.pathname)) {
    parsed.search = ""
  }
  parsed.pathname =
    parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname
  return parsed.toString()
}

const classifyUrl = (value: string): "detail" | "listing" | "other" => {
  const parsed = new URL(value)
  if (parsed.origin !== BASE_DOMAIN) {
    return "other"
  }
  if (DETAIL_PAGE_PATTERN.test(parsed.pathname)) {
    return "detail"
  }
  if (LISTING_PAGE_PATTERN.test(parsed.pathname)) {
    return "listing"
  }
  return "other"
}

const fetchPage = async (url: string): Promise<string> => {
  const response = await fetch(url, { headers: REQUEST_HEADERS })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`)
  }
  return response.text()
}

const extractLinks = (html: string, baseUrl: string): string[] => {
  const links: string[] = []
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi
  for (const match of html.matchAll(linkRegex)) {
    const href = match[1]
    if (!href) continue
    const absolute = toAbsoluteUrl(href, baseUrl)
    if (!absolute) continue
    links.push(normalizeUrl(absolute))
  }
  return unique(links)
}

const extractTagText = (html: string, tag: string): string[] => {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi")
  const values: string[] = []
  for (const match of html.matchAll(pattern)) {
    const text = htmlToText(match[1] ?? "").replace(/\s+/g, " ").trim()
    if (text) values.push(text)
  }
  return values
}

const startsWithActionStarter = (value: string): boolean => {
  const first = value.trim().toLowerCase().split(/\s+/)[0]
  return ACTION_STARTERS.has(first)
}

const lowerFirst = (value: string): string =>
  value.length === 0 ? value : `${value.charAt(0).toLowerCase()}${value.slice(1)}`

const ensureActionTitle = (value: string, prefix: string): string => {
  const cleaned = value.replace(/\s+/g, " ").trim()
  if (!cleaned) {
    return prefix
  }
  if (startsWithActionStarter(cleaned)) {
    return cleaned
  }
  return `${prefix} ${lowerFirst(cleaned)}`
}

const titleFromSlug = (url: string): string | null => {
  const parsed = new URL(url)
  if (!DETAIL_PAGE_PATTERN.test(parsed.pathname)) {
    return null
  }
  const slug = parsed.pathname.split("/").filter(Boolean).at(-1)
  if (!slug) return null
  const title = slug
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!title) return null
  return ensureActionTitle(title.charAt(0).toUpperCase() + title.slice(1), "Take action:")
}

const discover = async (ctx: SourceModuleContext): Promise<DiscoveredPage[]> => {
  const queue = [...SEED_URLS.map(normalizeUrl)]
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
    if (visited.has(currentUrl)) continue
    visited.add(currentUrl)

    try {
      const html = await fetchPage(currentUrl)
      const links = extractLinks(html, currentUrl)
      for (const link of links) {
        const classification = classifyUrl(link)
        if (classification === "detail") {
          detailPages.add(link)
        }
        if (classification === "listing" && !visited.has(link) && !queued.has(link)) {
          queued.add(link)
          queue.push(link)
        }
      }
    } catch (error) {
      ctx.logger.warn("DoSomething discovery fetch failed", {
        url: currentUrl,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (detailPages.size === 0) {
    return SEED_URLS.map((url) => ({ sourceKey: SOURCE_KEY, url: normalizeUrl(url) }))
  }

  return [...detailPages].slice(0, MAX_DISCOVERED_URLS).map((url) => ({
    sourceKey: SOURCE_KEY,
    url,
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
  const pageUrl = normalizeUrl(page.url)
  const classification = classifyUrl(pageUrl)

  if (classification === "detail") {
    const html = await fetchPage(pageUrl)
    const h1Title = extractTagText(html, "h1").at(0) ?? titleFromSlug(pageUrl) ?? "Take action"
    const description = extractTagText(html, "p").at(0) ?? h1Title
    return [
      {
        sourceKey: SOURCE_KEY,
        sourceUrl: pageUrl,
        title: ensureActionTitle(h1Title, "Take action:"),
        description,
        reasonSnippet: null,
        rawExcerpt: description,
        traits: [],
        meta: {
          extraction_strategy: "detail_page",
          source_evidence: {
            document_region: "h1_or_first_paragraph",
            detail_url: pageUrl,
          },
          extractor_version: "dosomething_v1",
        },
      },
    ]
  }

  if (classification === "listing") {
    const html = await fetchPage(pageUrl)
    const links = extractLinks(html, pageUrl)
      .filter((link) => classifyUrl(link) === "detail")
      .slice(0, MAX_DISCOVERED_URLS)

    const candidates: ExtractedCandidate[] = []
    for (const link of links) {
      const title = titleFromSlug(link)
      if (!title) continue
      candidates.push({
        sourceKey: SOURCE_KEY,
        sourceUrl: link,
        title,
        description: title,
        reasonSnippet: null,
        rawExcerpt: title,
        traits: [],
        meta: {
          extraction_strategy: "listing_link_slug",
          listing_url: pageUrl,
          source_evidence: {
            document_region: "anchor_href_slug",
            selector_hint: "a[href]",
          },
          extractor_version: "dosomething_v1",
        },
      })
    }

    return dedupeCandidates(candidates)
  }

  return []
}

const healthCheck = async (ctx: SourceModuleContext): Promise<SourceHealthCheckResult> => ({
  status: "ok",
  checkedAt: new Date().toISOString(),
  diagnostics: {
    source_key: SOURCE_KEY,
    base_domain: BASE_DOMAIN,
    seed_urls: SEED_URLS,
    default_locale: ctx.defaultLocale,
    extractor_version: "dosomething_v1",
  },
})

export const createDoSomethingSource = (): SourceModule => ({
  key: SOURCE_KEY,
  displayName: "DoSomething",
  discover,
  extract,
  healthCheck,
})
