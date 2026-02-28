import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

import {
  buildCandidateFromDetailPage,
  extractCandidatesFromListingPage,
  extractDetailLinksFromHtml,
  normalizeRakUrl,
} from "./parser.js"

const fixture = (name: string): string =>
  readFileSync(resolve(process.cwd(), "pipeline/src/sources/rak/fixtures", name), "utf8")

test("extractDetailLinksFromHtml keeps only canonical detail URLs", () => {
  const html = fixture("listing_page.html")
  const links = extractDetailLinksFromHtml(
    html,
    "https://www.randomactsofkindness.org/kindness-ideas"
  )

  assert.deepEqual(links, [
    "https://www.randomactsofkindness.org/kindness-ideas/101-write-a-thank-you-note",
    "https://www.randomactsofkindness.org/kindness-ideas/102-donate-books-to-library",
  ])
})

test("extractCandidatesFromListingPage emits detail source URLs (not listing URL)", () => {
  const listingUrl = "https://www.randomactsofkindness.org/kindness-ideas?page=2"
  const html = fixture("listing_page.html")

  const candidates = extractCandidatesFromListingPage(listingUrl, html)
  assert.equal(candidates.length, 2)

  for (const candidate of candidates) {
    assert.notEqual(candidate.sourceUrl, normalizeRakUrl(listingUrl))
    assert.match(candidate.sourceUrl, /\/kindness-ideas\/\d+-[a-z0-9-]+$/i)
  }
})

test("buildCandidateFromDetailPage extracts actionable idea from detail HTML", () => {
  const pageUrl = "https://www.randomactsofkindness.org/kindness-ideas/101-write-a-thank-you-note?ref=test"
  const html = fixture("detail_page_actionable.html")

  const candidate = buildCandidateFromDetailPage(pageUrl, html)
  assert.ok(candidate)
  assert.equal(
    candidate.sourceUrl,
    "https://www.randomactsofkindness.org/kindness-ideas/101-write-a-thank-you-note"
  )
  assert.equal(candidate.title, "Write a thank-you note to a teacher.")
})

test("buildCandidateFromDetailPage rejects non-actionable article-style detail content", () => {
  const pageUrl = "https://www.randomactsofkindness.org/kindness-ideas/999-why-kindness-matters"
  const html = fixture("detail_page_noise.html")

  const candidate = buildCandidateFromDetailPage(pageUrl, html)
  assert.equal(candidate, null)
})
