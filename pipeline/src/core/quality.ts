import { normalizeOptionalText } from "./normalize.js"
import type { ExtractedCandidate } from "./types.js"

export const QUALITY_RULE_VERSION = "v1"
export const DEFAULT_QUALITY_THRESHOLD = 0.6

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
  /\babout us\b/i,
  /\bcalendar\b/i,
  /\bcertificate\b/i,
  /\bcurriculum\b/i,
  /\bfaq\b/i,
  /\blesson\b/i,
  /\bposter\b/i,
  /\bprintable\b/i,
  /\bprivacy\b/i,
  /\bquotes?\b/i,
  /\bresearch\b/i,
  /\bstories?\b/i,
  /\bterms?\b/i,
  /\bvideos?\b/i,
]

const ARTICLE_STYLE_PATTERNS = [
  /^(how|why|what|when|where)\b/i,
  /\b\d+\s+(ways|reasons|tips|benefits)\b/i,
]

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)

export type CandidateQualityResult = {
  score: number
  passed: boolean
  threshold: number
  flags: string[]
}

const clampScore = (score: number): number => {
  if (score <= 0) return 0
  if (score >= 1) return 1
  return Number(score.toFixed(4))
}

export const evaluateCandidateQuality = (
  candidate: ExtractedCandidate,
  threshold = DEFAULT_QUALITY_THRESHOLD
): CandidateQualityResult => {
  const title = normalizeOptionalText(candidate.title) ?? ""
  const description = normalizeOptionalText(candidate.description) ?? ""
  const flags: string[] = []
  let score = 1

  if (title.length < 8) {
    flags.push("title_too_short")
    score -= 0.4
  }
  if (title.length > 160) {
    flags.push("title_too_long")
    score -= 0.25
  }
  if (description.length > 500) {
    flags.push("description_too_long")
    score -= 0.2
  }

  const titleTokens = tokenize(title)
  if (titleTokens.length < 3) {
    flags.push("title_not_actionable_length")
    score -= 0.25
  }

  if (title.endsWith("?")) {
    flags.push("title_question_form")
    score -= 0.2
  }

  const firstWord = titleTokens[0] ?? ""
  if (!ACTION_STARTERS.has(firstWord)) {
    flags.push("weak_action_start")
    score -= 0.3
  }

  for (const pattern of NON_IDEA_PATTERNS) {
    if (pattern.test(title) || pattern.test(description)) {
      flags.push("non_idea_pattern")
      score -= 0.5
      break
    }
  }

  for (const pattern of ARTICLE_STYLE_PATTERNS) {
    if (pattern.test(title)) {
      flags.push("article_style_title")
      score -= 0.35
      break
    }
  }

  const finalScore = clampScore(score)
  const hasHardFail = flags.includes("non_idea_pattern")
  const passed = !hasHardFail && finalScore >= threshold

  return {
    score: finalScore,
    passed,
    threshold,
    flags,
  }
}
