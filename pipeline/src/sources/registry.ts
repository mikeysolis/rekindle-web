import type { SourceModule } from "../core/types.js"
import { assertSourceModuleContract } from "./contract.js"
import { createActionForHappinessSource } from "./action_for_happiness/index.js"
import { createDoSomethingSource } from "./dosomething/index.js"
import { createGgiaSource } from "./ggia/index.js"
import { createRakSource } from "./rak/index.js"
import { createRedCrossPdfSource } from "./red_cross_pdf/index.js"

const sources: SourceModule[] = [
  createRakSource(),
  createGgiaSource(),
  createDoSomethingSource(),
  createActionForHappinessSource(),
  createRedCrossPdfSource(),
]
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
