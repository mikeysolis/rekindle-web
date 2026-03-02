import { collapseWhitespace } from "./normalize.js"

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": "\"",
  "&#39;": "'",
  "&nbsp;": " ",
}

export const decodeHtmlEntities = (input: string): string =>
  input.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITY_MAP[entity] ?? entity)

export const stripHtmlTags = (input: string): string =>
  input.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")

export const htmlToText = (input: string): string =>
  collapseWhitespace(decodeHtmlEntities(stripHtmlTags(input)))

export const extractTitleTag = (html: string): string | null => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match?.[1]) return null
  const text = htmlToText(match[1])
  return text.length > 0 ? text : null
}
