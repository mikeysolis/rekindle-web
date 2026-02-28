import { htmlToText } from "../../core/html.js"
import type {
  DiscoveredPage,
  ExtractedCandidate,
  SourceModule,
  SourceModuleContext,
} from "../../core/types.js"

const SOURCE_KEY = "rak"
const BASE_DOMAIN = "https://www.randomactsofkindness.org"

const SEED_URLS = [
  `${BASE_DOMAIN}/kindness-ideas`,
]

const REQUEST_HEADERS = {
  "user-agent": "rekindle-pipeline/0.1 (+https://rekindle.app)",
}

const MAX_DISCOVERED_URLS = 80
const MAX_DISCOVERY_FETCHES = 24
const MAX_DETAIL_CANDIDATES = 1
const DETAIL_PAGE_PATTERN = /^\/kindness-ideas\/\d+-[a-z0-9-]+\/?$/i
const LISTING_PAGE_PATTERN = /^\/kindness-ideas(?:\/|$)/i

const ACTION_STARTERS = new Set([
  "add",
  "adopt",
  "ask",
  "attend",
  "be",
  "bring",
  "build",
  "buy",
  "call",
  "celebrate",
  "check",
  "clean",
  "compliment",
  "cook",
  "create",
  "deliver",
  "do",
  "donate",
  "drop",
  "encourage",
  "forgive",
  "give",
  "go",
  "help",
  "hold",
  "host",
  "invite",
  "join",
  "leave",
  "listen",
  "mail",
  "make",
  "offer",
  "organize",
  "pick",
  "plan",
  "prepare",
  "say",
  "schedule",
  "send",
  "share",
  "smile",
  "start",
  "support",
  "take",
  "teach",
  "tell",
  "text",
  "thank",
  "visit",
  "volunteer",
  "write",
])

const NON_IDEA_PATTERNS = [
  /\bcalendar\b/i,
  /\bcertificate\b/i,
  /\bcurriculum\b/i,
  /\bfaq\b/i,
  /\blesson\b/i,
  /\bposter\b/i,
  /\bprintable\b/i,
  /\bquotes?\b/i,
  /\bresearch\b/i,
  /\bstories?\b/i,
  /\bvideos?\b/i,
]

const toAbsoluteUrl = (href: string, baseUrl: string): string | null => {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

const unique = <T>(items: T[]): T[] => [...new Set(items)]

const normalizeUrl = (value: string): string => {
  const parsed = new URL(value)
  parsed.hash = ""

  const pathname = parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
    ? parsed.pathname.slice(0, -1)
    : parsed.pathname
  parsed.pathname = pathname || "/"

  if (DETAIL_PAGE_PATTERN.test(parsed.pathname)) {
    parsed.search = ""
  }

  return parsed.toString()
}

const classifyRakUrl = (url: string): "detail" | "listing" | "other" => {
  const parsed = new URL(url)
  if (!parsed.origin.startsWith(BASE_DOMAIN)) {
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

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)

const normalizeIdeaText = (value: string): string | null => {
  const text = htmlToText(value)
    .replace(/^\d+\.\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
  if (text.length < 8) return null
  if (text.length > 220) return null
  return text
}

const sentenceCase = (value: string): string => {
  if (value.length === 0) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const isLikelyIdea = (value: string): boolean => {
  const trimmed = value.trim()
  const tokens = tokenize(trimmed)
  if (tokens.length < 3 || tokens.length > 20) return false
  const firstWord = tokens[0]
  if (!ACTION_STARTERS.has(firstWord)) return false
  for (const pattern of NON_IDEA_PATTERNS) {
    if (pattern.test(trimmed)) return false
  }
  return true
}

const ideaTitleFromUrl = (url: string): string | null => {
  const parsed = new URL(url)
  if (!DETAIL_PAGE_PATTERN.test(parsed.pathname)) {
    return null
  }

  const slug = parsed.pathname.split("/").filter(Boolean).at(-1)
  if (!slug) return null
  const withoutId = slug.replace(/^\d+-/, "")
  if (!withoutId) return null

  const text = sentenceCase(withoutId.replace(/-/g, " ").trim())
  return normalizeIdeaText(text)
}

const extractMetaContent = (html: string, key: string): string | null => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const patterns = [
    new RegExp(
      `<meta[^>]*(?:name|property)=[\"']${escaped}[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*content=[\"']([^\"']+)[\"'][^>]*(?:name|property)=[\"']${escaped}[\"'][^>]*>`,
      "i"
    ),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    const candidate = normalizeIdeaText(match?.[1] ?? "")
    if (candidate) return candidate
  }

  return null
}

const extractTagText = (html: string, tag: string): string[] => {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi")
  const values: string[] = []
  for (const match of html.matchAll(pattern)) {
    const normalized = normalizeIdeaText(match[1] ?? "")
    if (normalized) values.push(normalized)
  }
  return values
}

const extractDetailLinksFromHtml = (html: string, baseUrl: string): string[] => {
  const links: string[] = []
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi

  for (const match of html.matchAll(linkRegex)) {
    const href = match[1]
    if (!href) continue
    const absolute = toAbsoluteUrl(href, baseUrl)
    if (!absolute) continue
    const normalized = normalizeUrl(absolute)
    if (classifyRakUrl(normalized) !== "detail") continue
    links.push(normalized)
  }

  return unique(links).slice(0, MAX_DISCOVERED_URLS)
}

const buildCandidateFromDetailPage = (
  pageUrl: string,
  html: string
): ExtractedCandidate | null => {
  const urlTitle = ideaTitleFromUrl(pageUrl)
  const h1Titles = extractTagText(html, "h1")
  const metaTitle = extractMetaContent(html, "og:title")
  const metaDescription = extractMetaContent(html, "description")
    ?? extractMetaContent(html, "og:description")

  const titleCandidates = unique([
    ...(urlTitle ? [urlTitle] : []),
    ...(metaTitle ? [metaTitle] : []),
    ...h1Titles,
  ])

  const title = titleCandidates.find(isLikelyIdea) ?? titleCandidates.at(0)
  if (!title || !isLikelyIdea(title)) {
    return null
  }

  const descriptionCandidate = metaDescription && !NON_IDEA_PATTERNS.some((pattern) => pattern.test(metaDescription))
    ? metaDescription
    : title

  return {
    sourceKey: SOURCE_KEY,
    sourceUrl: pageUrl,
    title,
    description: descriptionCandidate,
    reasonSnippet: null,
    rawExcerpt: descriptionCandidate,
    traits: [],
    meta: { extraction_strategy: "detail_page" },
  }
}

const extractCandidatesFromListingPage = (
  pageUrl: string,
  html: string
): ExtractedCandidate[] => {
  const detailLinks = extractDetailLinksFromHtml(html, pageUrl)
  const candidates: ExtractedCandidate[] = []

  for (const detailUrl of detailLinks) {
    const title = ideaTitleFromUrl(detailUrl)
    if (!title || !isLikelyIdea(title)) continue

    candidates.push({
      sourceKey: SOURCE_KEY,
      sourceUrl: detailUrl,
      title,
      description: title,
      reasonSnippet: null,
      rawExcerpt: title,
      traits: [],
      meta: { extraction_strategy: "listing_link_slug", listing_url: pageUrl },
    })

    if (candidates.length >= MAX_DISCOVERED_URLS) {
      break
    }
  }

  return candidates
}

const fetchPage = async (url: string): Promise<string> => {
  const response = await fetch(url, { headers: REQUEST_HEADERS })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`)
  }
  return response.text()
}

const discover = async (ctx: SourceModuleContext): Promise<DiscoveredPage[]> => {
  const queue = [...SEED_URLS]
  const queued = new Set(queue.map(normalizeUrl))
  const visited = new Set<string>()
  const detailPages = new Set<string>()

  while (
    queue.length > 0 &&
    visited.size < MAX_DISCOVERY_FETCHES &&
    detailPages.size < MAX_DISCOVERED_URLS
  ) {
    const currentUrl = queue.shift()
    if (!currentUrl) continue

    const normalizedCurrentUrl = normalizeUrl(currentUrl)
    if (visited.has(normalizedCurrentUrl)) continue
    visited.add(normalizedCurrentUrl)

    try {
      const html = await fetchPage(normalizedCurrentUrl)
      const detailLinks = extractDetailLinksFromHtml(html, normalizedCurrentUrl)

      for (const detailLink of detailLinks) {
        detailPages.add(detailLink)

        if (
          !queued.has(detailLink) &&
          !visited.has(detailLink) &&
          queue.length < MAX_DISCOVERED_URLS
        ) {
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
    return SEED_URLS.map((url) => ({ sourceKey: SOURCE_KEY, url }))
  }

  return [...detailPages].slice(0, MAX_DISCOVERED_URLS).map((url) => ({
    sourceKey: SOURCE_KEY,
    url,
  }))
}

const extract = async (
  _ctx: SourceModuleContext,
  page: DiscoveredPage
): Promise<ExtractedCandidate[]> => {
  const html = await fetchPage(page.url)
  const classification = classifyRakUrl(page.url)

  if (classification === "detail") {
    const candidate = buildCandidateFromDetailPage(page.url, html)
    return candidate ? [candidate].slice(0, MAX_DETAIL_CANDIDATES) : []
  }

  if (classification === "listing") {
    return extractCandidatesFromListingPage(page.url, html)
  }

  return []
}

export const createRakSource = (): SourceModule => ({
  key: SOURCE_KEY,
  displayName: "Random Acts of Kindness",
  discover,
  extract,
})
