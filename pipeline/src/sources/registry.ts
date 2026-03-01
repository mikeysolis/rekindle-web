import type { SourceModule } from "../core/types.js"
import { assertSourceModuleContract } from "./contract.js"
import { createRakSource } from "./rak/index.js"

const sources: SourceModule[] = [createRakSource()]
for (const source of sources) {
  assertSourceModuleContract(source)
}

export const listSources = (): SourceModule[] => [...sources]

export const getSourceByKey = (key: string): SourceModule => {
  const source = sources.find((entry) => entry.key === key)
  if (!source) {
    const supported = sources.map((entry) => entry.key).join(", ")
    throw new Error(`Unknown source "${key}". Supported sources: ${supported}`)
  }
  return source
}
