import assert from "node:assert/strict"
import test from "node:test"

import {
  deriveSourceKeyFromInput,
  extractLinksFromHtml,
  normalizeProbeInput,
  recommendStrategyOrder,
  summarizeProbeSignals,
  type ProbePageArtifact,
} from "./source-probe.js"

test("normalizeProbeInput accepts bare domains and derives stable source key", () => {
  const url = normalizeProbeInput("example.org")
  assert.equal(url.toString(), "https://example.org/")
  assert.equal(deriveSourceKeyFromInput(url), "example_org")
})

test("extractLinksFromHtml resolves relative links and strips fragments", () => {
  const html = `
    <a href="/ideas">Ideas</a>
    <a href="https://example.org/feed.xml#top">Feed</a>
    <img src="/assets/logo.png" />
  `

  const links = extractLinksFromHtml(html, "https://example.org/root")
  assert.deepEqual(links.sort(), [
    "https://example.org/assets/logo.png",
    "https://example.org/feed.xml",
    "https://example.org/ideas",
  ])
})

test("recommendStrategyOrder prioritizes feed/ics when strong structured signals exist", () => {
  const pages: ProbePageArtifact[] = [
    {
      url: "https://example.org/",
      ok: true,
      status: 200,
      contentType: "text/html",
      durationMs: 120,
      error: null,
      dynamicHintCount: 0,
      links: [
        "https://example.org/feed.xml",
        "https://example.org/events.ics",
        "https://example.org/ideas/list",
        "https://example.org/ideas/small-kindness",
        "https://example.org/ideas/share-gratitude",
      ],
      sameOriginLinks: [
        "https://example.org/feed.xml",
        "https://example.org/events.ics",
        "https://example.org/ideas/list",
        "https://example.org/ideas/small-kindness",
        "https://example.org/ideas/share-gratitude",
      ],
    },
  ]

  const summary = summarizeProbeSignals({
    rootOrigin: "https://example.org",
    pages,
    sitemapHints: ["https://example.org/sitemap.xml"],
  })

  const recommendation = recommendStrategyOrder(summary)

  assert.equal(summary.feedLinkCount, 1)
  assert.equal(summary.icsLinkCount, 1)
  assert.ok(recommendation.strategyOrder.indexOf("ics") < recommendation.strategyOrder.indexOf("headless"))
  assert.ok(recommendation.strategyOrder.indexOf("feed") < recommendation.strategyOrder.indexOf("headless"))
  assert.ok(recommendation.confidence >= 0.3)
})

test("recommendStrategyOrder promotes headless when only dynamic hints are available", () => {
  const pages: ProbePageArtifact[] = [
    {
      url: "https://example.org/",
      ok: true,
      status: 200,
      contentType: "text/html",
      durationMs: 140,
      error: null,
      links: [],
      sameOriginLinks: [],
      dynamicHintCount: 3,
    },
    {
      url: "https://example.org/robots.txt",
      ok: false,
      status: 403,
      contentType: "text/plain",
      durationMs: 100,
      error: "HTTP 403",
      links: [],
      sameOriginLinks: [],
      dynamicHintCount: 0,
    },
  ]

  const summary = summarizeProbeSignals({
    rootOrigin: "https://example.org",
    pages,
    sitemapHints: [],
  })

  const recommendation = recommendStrategyOrder(summary)

  assert.equal(summary.dynamicHintCount, 3)
  assert.equal(recommendation.strategyOrder[0], "headless")
})
