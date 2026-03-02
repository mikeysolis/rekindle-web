import assert from "node:assert/strict"
import test from "node:test"

import type { SourceModuleContext } from "../../core/types.js"
import {
  assertDiscoveredPagesContract,
  assertExtractedCandidatesContract,
} from "../contract.js"
import { fixtureText, withMockFetch } from "../fixture-runner.js"
import { createRedCrossPdfSource } from "./index.js"

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

const LISTING_URL = "https://www.redcross.org/get-help/how-to-prepare-for-emergencies.html"
const PDF_URL =
  "https://www.redcross.org/content/dam/redcross/get-help/pdfs/home-fire/home-fire-escape-plan.pdf"

const listingHtml = fixtureText("pipeline/src/sources/red_cross_pdf/fixtures/listing_page.html")

test("Red Cross PDF discover returns PDF pages from listing fixtures", async () => {
  const source = createRedCrossPdfSource()

  const discovered = await withMockFetch(
    [{ url: LISTING_URL, body: listingHtml }],
    () => source.discover(testContext)
  )

  assertDiscoveredPagesContract(source, discovered)
  assert.ok(discovered.some((page) => page.url === PDF_URL))
})

test("Red Cross PDF extract returns contract-compliant candidates from PDF URLs", async () => {
  const source = createRedCrossPdfSource()

  const candidates = await source.extract(testContext, {
    sourceKey: source.key,
    url: PDF_URL,
  })

  assertExtractedCandidatesContract(source, candidates)
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].meta?.extraction_strategy, "pdf_filename")
})
