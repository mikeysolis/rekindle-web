import { htmlToText } from "../../core/html.js"
import type {
  DiscoveredPage,
  ExtractedCandidate,
  SourceModule,
  SourceModuleContext,
} from "../../core/types.js"

const SOURCE_KEY = "rak"

const SEED_URLS = [
  "https://www.randomactsofkindness.org/kindness-ideas",
]

const REQUEST_HEADERS = {
  "user-agent": "rekindle-pipeline/0.1 (+https://rekindle.app)",
}

const MAX_DISCOVERED_URLS = 80
const MAX_EXTRACTED_CANDIDATES = 150

const toAbsoluteUrl = (href: string, baseUrl: string): string | null => {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

const unique = <T>(items: T[]): T[] => [...new Set(items)]

const discoverLinksFromHtml = (html: string, baseUrl: string): string[] => {
  const links: string[] = []
  const linkRegex = /href\s*=\s*["']([^"']+)["']/gi

  for (const match of html.matchAll(linkRegex)) {
    const href = match[1]
    if (!href) continue
    const absolute = toAbsoluteUrl(href, baseUrl)
    if (!absolute) continue
    if (!absolute.startsWith("https://www.randomactsofkindness.org/")) continue
    if (!absolute.includes("/kindness-ideas/")) continue
    if (absolute.includes("/the-kindness-blog")) continue
    if (absolute.includes("/printables")) continue
    if (absolute.includes("#")) continue
    links.push(absolute)
  }

  return unique(links).slice(0, MAX_DISCOVERED_URLS)
}

const cleanIdeaText = (value: string): string | null => {
  const text = htmlToText(value)
    .replace(/^\d+\.\s*/, "")
    .replace(/^[-*]\s*/, "")
    .trim()
  if (text.length < 10) return null
  if (text.length > 260) return null
  return text
}

const ideaTitleFromDescription = (description: string): string => {
  const firstClause = description.split(/[.!?]/, 1)[0]?.trim() ?? description
  const clipped = firstClause.length > 72 ? `${firstClause.slice(0, 69)}...` : firstClause
  return clipped
}

const extractCandidatesFromHtml = (pageUrl: string, html: string): ExtractedCandidate[] => {
  const candidates: ExtractedCandidate[] = []

  const listItemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
  for (const match of html.matchAll(listItemRegex)) {
    const block = match[1]
    if (!block) continue
    const description = cleanIdeaText(block)
    if (!description) continue
    candidates.push({
      sourceKey: SOURCE_KEY,
      sourceUrl: pageUrl,
      title: ideaTitleFromDescription(description),
      description,
      reasonSnippet: null,
      rawExcerpt: description,
      traits: [],
      meta: { extraction_strategy: "li" },
    })
    if (candidates.length >= MAX_EXTRACTED_CANDIDATES) break
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
  const discovered = new Set<string>(SEED_URLS)

  for (const seedUrl of SEED_URLS) {
    try {
      const html = await fetchPage(seedUrl)
      for (const link of discoverLinksFromHtml(html, seedUrl)) {
        discovered.add(link)
      }
    } catch (error) {
      ctx.logger.warn("RAK discovery failed for seed url", {
        seedUrl,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return [...discovered].map((url) => ({
    sourceKey: SOURCE_KEY,
    url,
  }))
}

const extract = async (
  _ctx: SourceModuleContext,
  page: DiscoveredPage
): Promise<ExtractedCandidate[]> => {
  const html = await fetchPage(page.url)
  return extractCandidatesFromHtml(page.url, html)
}

export const createRakSource = (): SourceModule => ({
  key: SOURCE_KEY,
  displayName: "Random Acts of Kindness",
  discover,
  extract,
})
