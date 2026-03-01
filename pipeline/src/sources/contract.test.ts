import assert from "node:assert/strict"
import test from "node:test"

import type { SourceModuleContext } from "../core/types.js"
import {
  assertDiscoveredPagesContract,
  assertExtractedCandidatesContract,
  assertHealthCheckResultContract,
  assertSourceModuleContract,
} from "./contract.js"
import { listSources } from "./registry.js"

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

test("listSources returns modules that satisfy discover/extract/healthCheck contract", async () => {
  const sources = listSources()
  assert.ok(sources.length > 0)

  for (const source of sources) {
    assertSourceModuleContract(source)
    const health = await source.healthCheck(testContext)
    assertHealthCheckResultContract(source, health)
  }
})

test("assertDiscoveredPagesContract rejects mismatched sourceKey", () => {
  const source = listSources()[0]
  assert.throws(() => {
    assertDiscoveredPagesContract(source, [
      {
        sourceKey: "other",
        url: "https://example.com/page",
      },
    ])
  }, /mismatched sourceKey/i)
})

test("assertExtractedCandidatesContract requires extraction metadata completeness", () => {
  const source = listSources()[0]
  assert.throws(() => {
    assertExtractedCandidatesContract(source, [
      {
        sourceKey: source.key,
        sourceUrl: "https://example.com/idea",
        title: "Write a thank-you note",
        meta: {},
      },
    ])
  }, /extraction_strategy/i)
})
