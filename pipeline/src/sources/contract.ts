import type {
  DiscoveredPage,
  ExtractedCandidate,
  SourceHealthCheckResult,
  SourceModule,
} from "../core/types.js"

const EVIDENCE_META_KEYS = [
  "source_evidence",
  "selector_path",
  "node_key",
  "document_region",
  "listing_url",
  "detail_url",
] as const

const assertNonEmptyString = (value: unknown, context: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${context} must be a non-empty string`)
  }
  return value
}

const assertIsoDatetime = (value: string, context: string): void => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${context} must be a valid ISO datetime string`)
  }
}

const assertValidHttpUrl = (value: string, context: string): void => {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${context} must be a valid URL`)
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${context} must use http or https`)
  }
}

const hasEvidencePointer = (meta: Record<string, unknown>): boolean =>
  EVIDENCE_META_KEYS.some((key) => {
    const value = meta[key]
    if (value === null || value === undefined) {
      return false
    }

    if (typeof value === "string") {
      return value.trim().length > 0
    }

    if (typeof value === "object") {
      return true
    }

    return false
  })

export const assertSourceModuleContract = (source: SourceModule): void => {
  assertNonEmptyString(source.key, "source.key")
  assertNonEmptyString(source.displayName, "source.displayName")

  if (typeof source.discover !== "function") {
    throw new Error(`Source "${source.key}" is missing discover()`)
  }

  if (typeof source.extract !== "function") {
    throw new Error(`Source "${source.key}" is missing extract()`)
  }

  if (typeof source.healthCheck !== "function") {
    throw new Error(`Source "${source.key}" is missing healthCheck()`)
  }
}

export const assertHealthCheckResultContract = (
  source: SourceModule,
  result: SourceHealthCheckResult
): void => {
  if (result.status !== "ok" && result.status !== "degraded" && result.status !== "failed") {
    throw new Error(`Source "${source.key}" healthCheck returned invalid status`)
  }

  assertNonEmptyString(result.checkedAt, `Source "${source.key}" healthCheck.checkedAt`)
  assertIsoDatetime(result.checkedAt, `Source "${source.key}" healthCheck.checkedAt`)

  if (!result.diagnostics || typeof result.diagnostics !== "object" || Array.isArray(result.diagnostics)) {
    throw new Error(`Source "${source.key}" healthCheck.diagnostics must be an object`)
  }
}

export const assertDiscoveredPagesContract = (
  source: SourceModule,
  pages: DiscoveredPage[]
): void => {
  if (!Array.isArray(pages)) {
    throw new Error(`Source "${source.key}" discover() must return an array`)
  }

  for (const [index, page] of pages.entries()) {
    if (!page || typeof page !== "object") {
      throw new Error(`Source "${source.key}" discover() returned invalid page at index ${index}`)
    }

    if (page.sourceKey !== source.key) {
      throw new Error(
        `Source "${source.key}" discover() returned page with mismatched sourceKey "${page.sourceKey}" at index ${index}`
      )
    }

    const url = assertNonEmptyString(page.url, `Source "${source.key}" discover().url[${index}]`)
    assertValidHttpUrl(url, `Source "${source.key}" discover().url[${index}]`)
  }
}

export const assertExtractedCandidatesContract = (
  source: SourceModule,
  candidates: ExtractedCandidate[]
): void => {
  if (!Array.isArray(candidates)) {
    throw new Error(`Source "${source.key}" extract() must return an array`)
  }

  for (const [index, candidate] of candidates.entries()) {
    if (!candidate || typeof candidate !== "object") {
      throw new Error(`Source "${source.key}" extract() returned invalid candidate at index ${index}`)
    }

    if (candidate.sourceKey !== source.key) {
      throw new Error(
        `Source "${source.key}" extract() returned candidate with mismatched sourceKey "${candidate.sourceKey}" at index ${index}`
      )
    }

    assertNonEmptyString(candidate.title, `Source "${source.key}" candidate.title[${index}]`)
    assertValidHttpUrl(candidate.sourceUrl, `Source "${source.key}" candidate.sourceUrl[${index}]`)

    if (candidate.description !== undefined && candidate.description !== null) {
      assertNonEmptyString(
        candidate.description,
        `Source "${source.key}" candidate.description[${index}]`
      )
    }

    if (candidate.reasonSnippet !== undefined && candidate.reasonSnippet !== null) {
      assertNonEmptyString(
        candidate.reasonSnippet,
        `Source "${source.key}" candidate.reasonSnippet[${index}]`
      )
    }

    if (candidate.rawExcerpt !== undefined && candidate.rawExcerpt !== null) {
      assertNonEmptyString(
        candidate.rawExcerpt,
        `Source "${source.key}" candidate.rawExcerpt[${index}]`
      )
    }

    if (!candidate.meta || typeof candidate.meta !== "object" || Array.isArray(candidate.meta)) {
      throw new Error(
        `Source "${source.key}" candidate.meta[${index}] must be an object with extraction metadata`
      )
    }

    const extractionStrategy = candidate.meta.extraction_strategy
    if (typeof extractionStrategy !== "string" || extractionStrategy.trim().length === 0) {
      throw new Error(
        `Source "${source.key}" candidate.meta.extraction_strategy[${index}] is required`
      )
    }

    const meta = candidate.meta as Record<string, unknown>
    if (!hasEvidencePointer(meta)) {
      throw new Error(
        `Source "${source.key}" candidate.meta[${index}] must include at least one evidence pointer (${EVIDENCE_META_KEYS.join(
          ", "
        )})`
      )
    }

    if (candidate.traits) {
      for (const [traitIndex, trait] of candidate.traits.entries()) {
        assertNonEmptyString(
          trait.traitTypeSlug,
          `Source "${source.key}" candidate.traits[${index}].traitTypeSlug[${traitIndex}]`
        )
        assertNonEmptyString(
          trait.traitOptionSlug,
          `Source "${source.key}" candidate.traits[${index}].traitOptionSlug[${traitIndex}]`
        )
      }
    }
  }
}
