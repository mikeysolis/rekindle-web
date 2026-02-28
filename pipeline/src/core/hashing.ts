import { createHash } from "node:crypto"
import { normalizeForHash } from "./normalize.js"

export const sha256 = (input: string): string =>
  createHash("sha256").update(input).digest("hex")

export const buildCandidateKey = (parts: {
  sourceKey: string
  sourceUrl: string
  title: string
  description?: string | null
}): string => {
  const payload = [
    normalizeForHash(parts.sourceKey),
    normalizeForHash(parts.sourceUrl),
    normalizeForHash(parts.title),
    normalizeForHash(parts.description ?? ""),
  ].join("|")
  return sha256(payload)
}
