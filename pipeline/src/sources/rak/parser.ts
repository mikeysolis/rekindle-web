import { htmlToText } from "../../core/html.js"
import type { ExtractedCandidate } from "../../core/types.js"

export const SOURCE_KEY = "rak"
export const BASE_DOMAIN = "https://www.randomactsofkindness.org"
export const MAX_DISCOVERED_URLS = 80
export const MAX_DETAIL_CANDIDATES = 1

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
  "surprise",
  "support",
  "take",
  "teach",
  "tell",
  "text",
  "thank",
  "try",
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
  /\babout\s+us\b/i,
  /\bprivacy\b/i,
  /\bterms?\b/i,
]

const ARTICLE_STYLE_PATTERNS = [
  /^(how|why|what|when|where)\b/i,
  /\b\d+\s+(ways|reasons|tips|benefits)\b/i,
  /\bkindness\s+ideas\b/i,
]

const LEADING_NOISE_PATTERNS = [
  /^kindness idea\s*[:\-]\s*/i,
  /^idea\s*[:\-]\s*/i,
  /^\d+\.\s*/,
  /^[-*]\s*/,
]

const TRAILING_NOISE_PATTERNS = [
  /\s+read more\.?$/i,
]

const toAbsoluteUrl = (href: string, baseUrl: string): string | null => {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

const unique = <T>(items: T[]): T[] => [...new Set(items)]

export const normalizeRakUrl = (value: string): string => {
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

export const classifyRakUrl = (url: string): "detail" | "listing" | "other" => {
  const parsed = new URL(url)
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

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)

const sentenceCase = (value: string): string => {
  if (value.length === 0) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const normalizeIdeaText = (value: string): string | null => {
  let text = htmlToText(value).replace(/\s+/g, " ").trim()
  if (!text) return null

  for (const pattern of LEADING_NOISE_PATTERNS) {
    text = text.replace(pattern, "").trim()
  }
  for (const pattern of TRAILING_NOISE_PATTERNS) {
    text = text.replace(pattern, "").trim()
  }

  text = text.replace(/\s+/g, " ").trim()
  if (text.length < 8) return null
  if (text.length > 180) return null
  return text
}

const isLikelyIdea = (value: string): boolean => {
  const trimmed = value.trim()
  const tokens = tokenize(trimmed)
  if (tokens.length < 3 || tokens.length > 20) return false
  if (trimmed.endsWith("?")) return false
  const firstWord = tokens[0]
  if (!ACTION_STARTERS.has(firstWord)) return false

  for (const pattern of NON_IDEA_PATTERNS) {
    if (pattern.test(trimmed)) return false
  }

  return true
}

const isArticleStyleTitle = (value: string): boolean =>
  ARTICLE_STYLE_PATTERNS.some((pattern) => pattern.test(value))

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
  const normalized = normalizeIdeaText(text)
  if (!normalized) return null
  return isLikelyIdea(normalized) ? normalized : null
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

const extractActionLinesFromHtml = (html: string): string[] => {
  const linePattern = /<(li|p)[^>]*>([\s\S]*?)<\/\1>/gi
  const lines: string[] = []

  for (const match of html.matchAll(linePattern)) {
    const line = normalizeIdeaText(match[2] ?? "")
    if (!line) continue
    if (!isLikelyIdea(line)) continue
    if (isArticleStyleTitle(line)) continue
    lines.push(line)
  }

  return unique(lines)
}

export const extractDetailLinksFromHtml = (html: string, baseUrl: string): string[] => {
  const links: string[] = []
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi

  for (const match of html.matchAll(linkRegex)) {
    const href = match[1]
    if (!href) continue
    const absolute = toAbsoluteUrl(href, baseUrl)
    if (!absolute) continue
    const normalized = normalizeRakUrl(absolute)
    if (classifyRakUrl(normalized) !== "detail") continue
    links.push(normalized)
  }

  return unique(links).slice(0, MAX_DISCOVERED_URLS)
}

export const buildCandidateFromDetailPage = (
  pageUrl: string,
  html: string
): ExtractedCandidate | null => {
  const canonicalSourceUrl = normalizeRakUrl(pageUrl)
  if (classifyRakUrl(canonicalSourceUrl) !== "detail") {
    return null
  }

  const actionLines = extractActionLinesFromHtml(html)
  const urlTitle = ideaTitleFromUrl(canonicalSourceUrl)
  const h1Titles = extractTagText(html, "h1")
  const metaTitle = extractMetaContent(html, "og:title")
  const metaDescription = extractMetaContent(html, "description")
    ?? extractMetaContent(html, "og:description")

  const titleCandidates = unique([
    ...actionLines,
    ...(urlTitle ? [urlTitle] : []),
    ...(metaTitle ? [metaTitle] : []),
    ...h1Titles,
  ])

  const title = titleCandidates.find((value) => isLikelyIdea(value) && !isArticleStyleTitle(value))
  if (!title) {
    return null
  }

  const descriptionCandidate = [
    metaDescription,
    actionLines.find((line) => line !== title),
    title,
  ].find((value) => {
    if (!value) return false
    if (NON_IDEA_PATTERNS.some((pattern) => pattern.test(value))) return false
    return true
  }) ?? title

  return {
    sourceKey: SOURCE_KEY,
    sourceUrl: canonicalSourceUrl,
    title,
    description: descriptionCandidate,
    reasonSnippet: null,
    rawExcerpt: actionLines.at(0) ?? descriptionCandidate,
    traits: [],
    meta: {
      extraction_strategy: "detail_page",
      source_evidence: {
        document_region: "li_or_p_action_line",
        selector_hint: "li,p",
      },
      extractor_version: "rak_parser_v2",
    },
  }
}

export const extractCandidatesFromListingPage = (
  pageUrl: string,
  html: string
): ExtractedCandidate[] => {
  const listingUrl = normalizeRakUrl(pageUrl)
  const detailLinks = extractDetailLinksFromHtml(html, listingUrl)
  const candidates: ExtractedCandidate[] = []

  for (const detailUrl of detailLinks) {
    if (detailUrl === listingUrl) continue

    const title = ideaTitleFromUrl(detailUrl)
    if (!title || !isLikelyIdea(title) || isArticleStyleTitle(title)) continue

    candidates.push({
      sourceKey: SOURCE_KEY,
      sourceUrl: detailUrl,
      title,
      description: title,
      reasonSnippet: null,
      rawExcerpt: title,
      traits: [],
      meta: {
        extraction_strategy: "listing_link_slug",
        listing_url: listingUrl,
        source_evidence: {
          document_region: "anchor_href_slug",
        },
        extractor_version: "rak_parser_v2",
      },
    })

    if (candidates.length >= MAX_DISCOVERED_URLS) {
      break
    }
  }

  return candidates
}
