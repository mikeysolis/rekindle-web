import { runSource } from "./jobs/run-source.js"
import { reconcilePromotions } from "./jobs/reconcile-promotions.js"
import { listSources } from "./sources/registry.js"
import { loadLocalEnvFiles } from "./config/load-env.js"

const help = () => {
  console.log("Rekindle content pipeline CLI")
  console.log("")
  console.log("Commands:")
  console.log("  list-sources")
  console.log("  run-source <source_key>")
  console.log("  reconcile-promotions")
}

async function main(): Promise<void> {
  loadLocalEnvFiles()

  const [command, ...args] = process.argv.slice(2)

  switch (command) {
    case "list-sources": {
      const sources = listSources().map((source) => ({
        key: source.key,
        displayName: source.displayName,
      }))
      console.log(JSON.stringify(sources, null, 2))
      return
    }

    case "run-source": {
      const sourceKey = args[0]
      if (!sourceKey) {
        throw new Error("Missing source key. Usage: run-source <source_key>")
      }
      const result = await runSource(sourceKey)
      console.log(JSON.stringify(result, null, 2))
      return
    }

    case "reconcile-promotions": {
      const result = await reconcilePromotions()
      console.log(JSON.stringify(result, null, 2))
      return
    }

    default: {
      help()
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exitCode = 1
})
