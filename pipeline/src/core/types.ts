import type { Logger } from "./logger.js"
import type { JsonValue } from "./json.js"

export interface TraitHint {
  traitTypeSlug: string
  traitOptionSlug: string
  confidence?: number
  source?: string
}

export interface DiscoveredPage {
  sourceKey: string
  url: string
}

export interface ExtractedCandidate {
  sourceKey: string
  sourceUrl: string
  title: string
  description?: string | null
  reasonSnippet?: string | null
  rawExcerpt?: string | null
  traits?: TraitHint[]
  meta?: Record<string, JsonValue>
}

export interface SourceModuleContext {
  logger: Logger
  defaultLocale: string
}

export type SourceHealthStatus = "ok" | "degraded" | "failed"

export interface SourceHealthCheckResult {
  status: SourceHealthStatus
  checkedAt: string
  diagnostics: Record<string, JsonValue>
}

export interface SourceModule {
  key: string
  displayName: string
  discover: (ctx: SourceModuleContext) => Promise<DiscoveredPage[]>
  extract: (ctx: SourceModuleContext, page: DiscoveredPage) => Promise<ExtractedCandidate[]>
  healthCheck: (ctx: SourceModuleContext) => Promise<SourceHealthCheckResult>
}
