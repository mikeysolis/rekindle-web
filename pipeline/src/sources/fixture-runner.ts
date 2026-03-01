import { readFileSync } from "node:fs"
import { resolve } from "node:path"

export interface MockFetchFixture {
  url: string
  body: string
  status?: number
  contentType?: string
}

const normalizeFixtureUrl = (url: string): string => {
  const parsed = new URL(url)
  parsed.hash = ""
  return parsed.toString()
}

const responseFromFixture = (fixture: MockFetchFixture): Response =>
  new Response(fixture.body, {
    status: fixture.status ?? 200,
    headers: {
      "content-type": fixture.contentType ?? "text/html; charset=utf-8",
    },
  })

export const fixtureText = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8")

export async function withMockFetch<T>(
  fixtures: MockFetchFixture[],
  run: () => Promise<T>
): Promise<T> {
  const fixtureByUrl = new Map(
    fixtures.map((fixture) => [normalizeFixtureUrl(fixture.url), fixture])
  )
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input: string | URL | { url: string }): Promise<Response> => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input.url)
    const normalized = normalizeFixtureUrl(rawUrl)
    const fixture = fixtureByUrl.get(normalized)

    if (!fixture) {
      return new Response(`Missing mock fetch fixture for ${normalized}`, {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      })
    }

    return responseFromFixture(fixture)
  }

  try {
    return await run()
  } finally {
    globalThis.fetch = originalFetch
  }
}
