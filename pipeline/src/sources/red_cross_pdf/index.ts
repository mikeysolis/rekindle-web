import type {
  DiscoveredPage,
  ExtractedCandidate,
  SourceHealthCheckResult,
  SourceModule,
  SourceModuleContext,
} from "../../core/types.js"

const SOURCE_KEY = "red_cross_pdf"
const BASE_DOMAIN = "https://www.redcross.org"
const SEED_URLS = [`${BASE_DOMAIN}/get-help/how-to-prepare-for-emergencies.html`]
const MAX_DISCOVERED_URLS = 80
const MAX_DISCOVERY_FETCHES = 8

const REQUEST_HEADERS = {
  "user-agent": "rekindle-pipeline/0.1 (+https://rekindle.app)",
}

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

const isRedCrossHost = (host: string): boolean =>
  host === "redcross.org" || host.endsWith(".redcross.org")

const isPdfUrl = (value: string): boolean => /\.pdf$/i.test(new URL(value).pathname)

const classifyUrl = (value: string): "pdf" | "listing" | "other" => {
  const parsed = new URL(value)
  if (!isRedCrossHost(parsed.hostname)) {
    return "other"
  }
  if (isPdfUrl(value)) {
    return "pdf"
  }
  return "listing"
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

const titleCase = (value: string): string =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

const titleFromPdfUrl = (url: string): string => {
  const parsed = new URL(url)
  const fileName = decodeURIComponent(parsed.pathname.split("/").at(-1) ?? "")
  const baseName = fileName.replace(/\.pdf$/i, "")
  const normalized = baseName.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  const humanTitle = normalized.length > 0 ? titleCase(normalized) : "Preparedness Checklist"
  return `Prepare using ${humanTitle}`
}

const discover = async (ctx: SourceModuleContext): Promise<DiscoveredPage[]> => {
  const queue = [...SEED_URLS.map(normalizeUrl)]
  const queued = new Set(queue)
  const visited = new Set<string>()
  const pdfUrls = new Set<string>()

  while (
    queue.length > 0 &&
    visited.size < MAX_DISCOVERY_FETCHES &&
    pdfUrls.size < MAX_DISCOVERED_URLS
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
        if (classification === "pdf") {
          pdfUrls.add(link)
        }
        if (classification === "listing" && !visited.has(link) && !queued.has(link)) {
          queued.add(link)
          queue.push(link)
        }
      }
    } catch (error) {
      ctx.logger.warn("Red Cross PDF discovery fetch failed", {
        url: currentUrl,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (pdfUrls.size === 0) {
    return SEED_URLS.map((url) => ({ sourceKey: SOURCE_KEY, url }))
  }

  return [...pdfUrls].slice(0, MAX_DISCOVERED_URLS).map((url) => ({
    sourceKey: SOURCE_KEY,
    url,
  }))
}

const candidateFromPdfUrl = (pdfUrl: string): ExtractedCandidate => {
  const title = titleFromPdfUrl(pdfUrl)
  return {
    sourceKey: SOURCE_KEY,
    sourceUrl: pdfUrl,
    title,
    description:
      "Use this Red Cross PDF resource as a practical checklist for a concrete preparedness action.",
    reasonSnippet: null,
    rawExcerpt: title,
    traits: [],
    meta: {
      extraction_strategy: "pdf_filename",
      source_evidence: {
        document_region: "pdf_filename",
        detail_url: pdfUrl,
      },
      extractor_version: "red_cross_pdf_v1",
    },
  }
}

const extract = async (
  _ctx: SourceModuleContext,
  page: DiscoveredPage
): Promise<ExtractedCandidate[]> => {
  const pageUrl = normalizeUrl(page.url)
  const classification = classifyUrl(pageUrl)

  if (classification === "pdf") {
    return [candidateFromPdfUrl(pageUrl)]
  }

  if (classification === "listing") {
    const html = await fetchPage(pageUrl)
    const links = extractLinks(html, pageUrl)
      .filter((link) => classifyUrl(link) === "pdf")
      .slice(0, MAX_DISCOVERED_URLS)
    return links.map((link) => candidateFromPdfUrl(link))
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
    extractor_version: "red_cross_pdf_v1",
  },
})

export const createRedCrossPdfSource = (): SourceModule => ({
  key: SOURCE_KEY,
  displayName: "Red Cross (PDF)",
  discover,
  extract,
  healthCheck,
})
