import assert from "node:assert/strict"
import test from "node:test"

import type { SourceModuleContext } from "../../core/types.js"
import {
  assertDiscoveredPagesContract,
  assertExtractedCandidatesContract,
} from "../contract.js"
import { fixtureText, withMockFetch } from "../fixture-runner.js"
import { createRakSource } from "./index.js"

const noop = () => {}
const testContext: SourceModuleContext = {
  logger: {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
  },
  defaultLocale: "en",
}

const LISTING_URL = "https://www.randomactsofkindness.org/kindness-ideas"
const DETAIL_ACTIONABLE_URL =
  "https://www.randomactsofkindness.org/kindness-ideas/101-write-a-thank-you-note"
const DETAIL_NOISE_URL =
  "https://www.randomactsofkindness.org/kindness-ideas/102-donate-books-to-library"

const listingHtml = fixtureText("pipeline/src/sources/rak/fixtures/listing_page.html")
const actionableHtml = fixtureText("pipeline/src/sources/rak/fixtures/detail_page_actionable.html")
const noiseHtml = fixtureText("pipeline/src/sources/rak/fixtures/detail_page_noise.html")

test("RAK source discover returns contract-compliant detail pages from fixtures", async () => {
  const source = createRakSource()

  const discovered = await withMockFetch(
    [
      { url: LISTING_URL, body: listingHtml },
      { url: DETAIL_ACTIONABLE_URL, body: actionableHtml },
      { url: DETAIL_NOISE_URL, body: noiseHtml },
    ],
    () => source.discover(testContext)
  )

  assertDiscoveredPagesContract(source, discovered)
  assert.deepEqual(
    discovered.map((page) => page.url),
    [DETAIL_ACTIONABLE_URL, DETAIL_NOISE_URL]
  )
})

test("RAK source extract emits contract-compliant candidates with metadata", async () => {
  const source = createRakSource()

  const listingCandidates = await withMockFetch(
    [{ url: LISTING_URL, body: listingHtml }],
    () =>
      source.extract(testContext, {
        sourceKey: source.key,
        url: LISTING_URL,
      })
  )
  assertExtractedCandidatesContract(source, listingCandidates)
  assert.ok(
    listingCandidates.every(
      (candidate) => candidate.meta?.extraction_strategy === "listing_link_slug"
    )
  )

  const detailCandidates = await withMockFetch(
    [{ url: DETAIL_ACTIONABLE_URL, body: actionableHtml }],
    () =>
      source.extract(testContext, {
        sourceKey: source.key,
        url: DETAIL_ACTIONABLE_URL,
      })
  )
  assertExtractedCandidatesContract(source, detailCandidates)
  assert.equal(detailCandidates.length, 1)
  assert.equal(detailCandidates[0].meta?.extraction_strategy, "detail_page")
})
