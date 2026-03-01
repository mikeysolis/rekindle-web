import assert from "node:assert/strict"
import test from "node:test"

import type { SourceModuleContext } from "../../core/types.js"
import {
  assertDiscoveredPagesContract,
  assertExtractedCandidatesContract,
} from "../contract.js"
import { fixtureText, withMockFetch } from "../fixture-runner.js"
import { createActionForHappinessSource } from "./index.js"

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

const LISTING_URL = "https://www.actionforhappiness.org/calendar"
const ICS_URL = "https://www.actionforhappiness.org/calendar/feed.ics"
const DETAIL_URL = "https://www.actionforhappiness.org/calendar/event/join-a-kindness-circle"

const listingHtml = fixtureText(
  "pipeline/src/sources/action_for_happiness/fixtures/listing_page.html"
)
const eventsIcs = fixtureText(
  "pipeline/src/sources/action_for_happiness/fixtures/events_feed.ics"
)
const detailHtml = fixtureText(
  "pipeline/src/sources/action_for_happiness/fixtures/detail_page.html"
)

test("Action for Happiness discover prioritizes ICS and detail pages from fixtures", async () => {
  const source = createActionForHappinessSource()

  const discovered = await withMockFetch(
    [{ url: LISTING_URL, body: listingHtml }],
    () => source.discover(testContext)
  )

  assertDiscoveredPagesContract(source, discovered)
  assert.equal(discovered[0].url, ICS_URL)
  assert.ok(discovered.some((page) => page.url === DETAIL_URL))
})

test("Action for Happiness extract handles ICS-first and detail pages", async () => {
  const source = createActionForHappinessSource()

  const icsCandidates = await withMockFetch(
    [{ url: ICS_URL, body: eventsIcs }],
    () =>
      source.extract(testContext, {
        sourceKey: source.key,
        url: ICS_URL,
      })
  )
  assertExtractedCandidatesContract(source, icsCandidates)
  assert.ok(
    icsCandidates.every((candidate) => candidate.meta?.extraction_strategy === "ics_event_feed")
  )
  assert.ok(icsCandidates.length >= 2)

  const detailCandidates = await withMockFetch(
    [{ url: DETAIL_URL, body: detailHtml }],
    () =>
      source.extract(testContext, {
        sourceKey: source.key,
        url: DETAIL_URL,
      })
  )
  assertExtractedCandidatesContract(source, detailCandidates)
  assert.equal(detailCandidates[0].meta?.extraction_strategy, "detail_page")
})
