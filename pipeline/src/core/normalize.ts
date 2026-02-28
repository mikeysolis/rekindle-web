export const collapseWhitespace = (input: string): string =>
  input.replace(/\s+/g, " ").trim()

export const normalizeForHash = (input: string): string =>
  collapseWhitespace(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")

export const normalizeOptionalText = (input: string | null | undefined): string | null => {
  if (!input) return null
  const collapsed = collapseWhitespace(input)
  return collapsed.length > 0 ? collapsed : null
}
