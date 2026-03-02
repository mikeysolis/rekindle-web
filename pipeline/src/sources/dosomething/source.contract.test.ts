import assert from "node:assert/strict"
import test from "node:test"

import type { SourceModuleContext } from "../../core/types.js"
import {
  assertDiscoveredPagesContract,
  assertExtractedCandidatesContract,
} from "../contract.js"
import { fixtureText, withMockFetch } from "../fixture-runner.js"
import { createDoSomethingSource } from "./index.js"

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

const LISTING_URL = "https://www.dosomething.org/us/campaigns"
const DETAIL_URL = "https://www.dosomething.org/us/campaigns/clean-up-your-block"

const listingHtml = fixtureText("pipeline/src/sources/dosomething/fixtures/listing_page.html")
const detailHtml = fixtureText("pipeline/src/sources/dosomething/fixtures/detail_page.html")

test("DoSomething source discover returns campaign detail pages from fixtures", async () => {
  const source = createDoSomethingSource()

  const discovered = await withMockFetch(
    [{ url: LISTING_URL, body: listingHtml }],
    () => source.discover(testContext)
  )

  assertDiscoveredPagesContract(source, discovered)
  assert.ok(discovered.some((page) => page.url === DETAIL_URL))
})

test("DoSomething source extract returns contract-compliant candidates", async () => {
  const source = createDoSomethingSource()

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
    listingCandidates.every((candidate) => candidate.meta?.extraction_strategy === "listing_link_slug")
  )

  const detailCandidates = await withMockFetch(
    [{ url: DETAIL_URL, body: detailHtml }],
    () =>
      source.extract(testContext, {
        sourceKey: source.key,
        url: DETAIL_URL,
      })
  )
  assertExtractedCandidatesContract(source, detailCandidates)
  assert.equal(detailCandidates.length, 1)
  assert.equal(detailCandidates[0].meta?.extraction_strategy, "detail_page")
})
