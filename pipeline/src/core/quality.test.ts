import assert from "node:assert/strict"
import test from "node:test"

import { DEFAULT_QUALITY_THRESHOLD, evaluateCandidateQuality } from "./quality.js"

test("evaluateCandidateQuality passes a concise actionable idea", () => {
  const result = evaluateCandidateQuality({
    sourceKey: "rak",
    sourceUrl: "https://www.randomactsofkindness.org/kindness-ideas/101-write-a-thank-you-note",
    title: "Write a thank-you note to a teacher.",
    description: "A short personal note can make someone feel seen and appreciated.",
  })

  assert.equal(result.passed, true)
  assert.ok(result.score >= DEFAULT_QUALITY_THRESHOLD)
  assert.equal(result.flags.length, 0)
})

test("evaluateCandidateQuality rejects obvious non-idea content with explainable flags", () => {
  const result = evaluateCandidateQuality({
    sourceKey: "rak",
    sourceUrl: "https://www.randomactsofkindness.org/kindness-ideas/999-why-kindness-matters",
    title: "Why kindness matters in schools",
    description: "Read our printable curriculum and research summary for educators.",
  })

  assert.equal(result.passed, false)
  assert.ok(result.flags.includes("article_style_title"))
  assert.ok(result.flags.includes("non_idea_pattern"))
})
