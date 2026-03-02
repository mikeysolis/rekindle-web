import type {
  DiscoveredPage,
  ExtractedCandidate,
  SourceHealthCheckResult,
  SourceModule,
  SourceModuleContext,
} from "../../core/types.js"
import { htmlToText } from "../../core/html.js"

const SOURCE_KEY = "action_for_happiness"
const BASE_DOMAIN = "https://www.actionforhappiness.org"
const SEED_URLS = [`${BASE_DOMAIN}/calendar`]
const MAX_DISCOVERED_URLS = 80
const MAX_DISCOVERY_FETCHES = 12
const MAX_ICS_EVENTS = 50

const REQUEST_HEADERS = {
  "user-agent": "rekindle-pipeline/0.1 (+https://rekindle.app)",
}

const DETAIL_PAGE_PATTERNS = [
  /^\/calendar\/event\/[a-z0-9-]+\/?$/i,
  /^\/events\/[a-z0-9-]+\/?$/i,
]
const LISTING_PAGE_PATTERNS = [/^\/calendar(?:\/|$)/i, /^\/events(?:\/|$)/i]
const ACTION_STARTERS = new Set([
  "add",
  "ask",
  "attend",
  "be",
  "bring",
  "call",
  "check",
  "create",
  "do",
  "give",
  "help",
  "join",
  "make",
  "offer",
  "plan",
  "practice",
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
  parsed.pathname =
    parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname
  return parsed.toString()
}

const isIcsUrl = (value: string): boolean => {
  const parsed = new URL(value)
  return /\.ics$/i.test(parsed.pathname)
}

const classifyUrl = (value: string): "ics" | "detail" | "listing" | "other" => {
  const parsed = new URL(value)
  if (parsed.origin !== BASE_DOMAIN) {
    return "other"
  }
  if (isIcsUrl(value)) {
    return "ics"
  }
  if (DETAIL_PAGE_PATTERNS.some((pattern) => pattern.test(parsed.pathname))) {
    return "detail"
  }
  if (LISTING_PAGE_PATTERNS.some((pattern) => pattern.test(parsed.pathname))) {
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
  const slug = parsed.pathname.split("/").filter(Boolean).at(-1)
  if (!slug) return null
  const title = slug
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!title) return null
  return ensureActionTitle(title.charAt(0).toUpperCase() + title.slice(1), "Try")
}

const unfoldIcsLines = (input: string): string[] => {
  const normalized = input.replace(/\r\n/g, "\n")
  const lines = normalized.split("\n")
  const output: string[] = []
  for (const line of lines) {
    if (line.startsWith(" ") && output.length > 0) {
      output[output.length - 1] += line.slice(1)
      continue
    }
    output.push(line)
  }
  return output
}

const parseIcsProperty = (line: string, property: string): string | null => {
  const pattern = new RegExp(`^${property}(?:;[^:]*)?:(.*)$`, "i")
  const match = line.match(pattern)
  if (!match) return null
  const raw = match[1] ?? ""
  const value = raw
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\s+/g, " ")
    .trim()
  return value || null
}

const parseIcsEvents = (ics: string): Array<{
  summary: string
  description: string | null
  url: string | null
}> => {
  const lines = unfoldIcsLines(ics)
  const events: Array<{
    summary: string
    description: string | null
    url: string | null
  }> = []

  let inEvent = false
  let summary: string | null = null
  let description: string | null = null
  let url: string | null = null

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true
      summary = null
      description = null
      url = null
      continue
    }

    if (line === "END:VEVENT") {
      if (inEvent && summary) {
        events.push({
          summary,
          description,
          url,
        })
      }
      inEvent = false
      continue
    }

    if (!inEvent) {
      continue
    }

    const summaryValue = parseIcsProperty(line, "SUMMARY")
    if (summaryValue) {
      summary = summaryValue
      continue
    }

    const descriptionValue = parseIcsProperty(line, "DESCRIPTION")
    if (descriptionValue) {
      description = descriptionValue
      continue
    }

    const urlValue = parseIcsProperty(line, "URL")
    if (urlValue) {
      url = urlValue
    }
  }

  return events
}

const discover = async (ctx: SourceModuleContext): Promise<DiscoveredPage[]> => {
  const queue = [...SEED_URLS.map(normalizeUrl)]
  const queued = new Set(queue)
  const visited = new Set<string>()
  const discoveredIcs = new Set<string>()
  const detailPages = new Set<string>()

  while (
    queue.length > 0 &&
    visited.size < MAX_DISCOVERY_FETCHES &&
    discoveredIcs.size + detailPages.size < MAX_DISCOVERED_URLS
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
        if (classification === "ics") {
          discoveredIcs.add(link)
          continue
        }
        if (classification === "detail") {
          detailPages.add(link)
          continue
        }
        if (classification === "listing" && !queued.has(link) && !visited.has(link)) {
          queued.add(link)
          queue.push(link)
        }
      }
    } catch (error) {
      ctx.logger.warn("Action for Happiness discovery fetch failed", {
        url: currentUrl,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const discovered = [...discoveredIcs, ...detailPages]
  if (discovered.length === 0) {
    return SEED_URLS.map((url) => ({ sourceKey: SOURCE_KEY, url: normalizeUrl(url) }))
  }

  return discovered.slice(0, MAX_DISCOVERED_URLS).map((url) => ({
    sourceKey: SOURCE_KEY,
    url,
  }))
}

const extract = async (
  _ctx: SourceModuleContext,
  page: DiscoveredPage
): Promise<ExtractedCandidate[]> => {
  const pageUrl = normalizeUrl(page.url)
  const classification = classifyUrl(pageUrl)

  if (classification === "ics") {
    const ics = await fetchPage(pageUrl)
    const events = parseIcsEvents(ics).slice(0, MAX_ICS_EVENTS)
    return events
      .map((event, index) => {
        const title = ensureActionTitle(event.summary, "Try")
        const sourceUrl = event.url ? normalizeUrl(event.url) : `${pageUrl}#event-${index + 1}`
        const description = event.description ?? event.summary
        return {
          sourceKey: SOURCE_KEY,
          sourceUrl,
          title,
          description,
          reasonSnippet: null,
          rawExcerpt: description,
          traits: [],
          meta: {
            extraction_strategy: "ics_event_feed",
            source_evidence: {
              document_region: "vevent",
              selector_hint: "BEGIN:VEVENT",
            },
            listing_url: pageUrl,
            extractor_version: "action_for_happiness_v1",
          },
        } satisfies ExtractedCandidate
      })
      .filter((candidate) => candidate.title.length > 0)
  }

  if (classification === "detail") {
    const html = await fetchPage(pageUrl)
    const h1Title = extractTagText(html, "h1").at(0) ?? titleFromSlug(pageUrl) ?? "Try this action"
    const description = extractTagText(html, "p").at(0) ?? h1Title
    return [
      {
        sourceKey: SOURCE_KEY,
        sourceUrl: pageUrl,
        title: ensureActionTitle(h1Title, "Try"),
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
          extractor_version: "action_for_happiness_v1",
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
          extractor_version: "action_for_happiness_v1",
        },
      })
    }

    return candidates
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
    prefers_ics: true,
    extractor_version: "action_for_happiness_v1",
  },
})

export const createActionForHappinessSource = (): SourceModule => ({
  key: SOURCE_KEY,
  displayName: "Action for Happiness",
  discover,
  extract,
  healthCheck,
})
