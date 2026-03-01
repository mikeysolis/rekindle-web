import { runSource } from "./jobs/run-source.js"
import { reconcilePromotions } from "./jobs/reconcile-promotions.js"
import { sourceHealth } from "./jobs/source-health.js"
import { sourceProbe } from "./jobs/source-probe.js"
import { incidentAlerts } from "./jobs/incident-alerts.js"
import { listSources } from "./sources/registry.js"
import { loadLocalEnvFiles } from "./config/load-env.js"
import type { SourceOnboardingApprovalAction } from "./durable-store/repository.js"
import type { SourceProbeOptions } from "./jobs/source-probe.js"

const SOURCE_PROBE_APPROVAL_ACTIONS: SourceOnboardingApprovalAction[] = [
  "pending_review",
  "approved_for_trial",
  "rejected",
]

const takeFlagValue = (args: string[], index: number, flag: string): string => {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`)
  }
  return value
}

const parseSourceProbeArgs = (args: string[]): {
  input: string
  options: SourceProbeOptions
} => {
  const input = args[0]
  if (!input) {
    throw new Error(
      "Missing input. Usage: source-probe <url_or_domain> [--source-key <key>] [--display-name <name>] [--owner-team <team>] [--approval-action pending_review|approved_for_trial|rejected] [--decision-reason <reason>] [--actor-user-id <uuid>] [--max-pages <number>] [--no-create-proposal]"
    )
  }

  const options: SourceProbeOptions = {}

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index]

    switch (token) {
      case "--source-key": {
        options.sourceKey = takeFlagValue(args, index, token)
        index += 1
        break
      }

      case "--display-name": {
        options.displayName = takeFlagValue(args, index, token)
        index += 1
        break
      }

      case "--owner-team": {
        options.ownerTeam = takeFlagValue(args, index, token)
        index += 1
        break
      }

      case "--approval-action": {
        const action = takeFlagValue(args, index, token)
        if (
          !SOURCE_PROBE_APPROVAL_ACTIONS.includes(action as SourceOnboardingApprovalAction)
        ) {
          throw new Error(
            `Invalid --approval-action "${action}". Allowed values: ${SOURCE_PROBE_APPROVAL_ACTIONS.join(", ")}`
          )
        }
        options.operatorApprovalAction = action as SourceOnboardingApprovalAction
        index += 1
        break
      }

      case "--decision-reason": {
        options.operatorDecisionReason = takeFlagValue(args, index, token)
        index += 1
        break
      }

      case "--actor-user-id": {
        options.actorUserId = takeFlagValue(args, index, token)
        index += 1
        break
      }

      case "--max-pages": {
        const raw = takeFlagValue(args, index, token)
        const parsed = Number.parseInt(raw, 10)
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error(`Invalid --max-pages "${raw}". Provide a positive integer.`)
        }
        options.maxProbePages = parsed
        index += 1
        break
      }

      case "--no-create-proposal": {
        options.createProposal = false
        break
      }

      default: {
        throw new Error(`Unknown source-probe option: ${token}`)
      }
    }
  }

  return {
    input,
    options,
  }
}

const help = () => {
  console.log("Rekindle content pipeline CLI")
  console.log("")
  console.log("Commands:")
  console.log("  list-sources")
  console.log("  run-source <source_key> [--respect-cadence] [--force]")
  console.log("  source-health [source_key]")
  console.log("  incident-alerts [source_key]")
  console.log(
    "  source-probe <url_or_domain> [--source-key <key>] [--display-name <name>] [--owner-team <team>] [--approval-action pending_review|approved_for_trial|rejected] [--decision-reason <reason>] [--actor-user-id <uuid>] [--max-pages <number>] [--no-create-proposal]"
  )
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
        throw new Error(
          "Missing source key. Usage: run-source <source_key> [--respect-cadence] [--force]"
        )
      }
      const runArgs = args.slice(1)
      const result = await runSource(sourceKey, {
        respectCadence: runArgs.includes("--respect-cadence"),
        force: runArgs.includes("--force"),
      })
      console.log(JSON.stringify(result, null, 2))
      return
    }

    case "source-health": {
      const sourceKey = args[0]
      const result = await sourceHealth(sourceKey)
      console.log(JSON.stringify(result, null, 2))
      return
    }

    case "incident-alerts": {
      const sourceKey = args[0]
      const result = await incidentAlerts(sourceKey)
      console.log(JSON.stringify(result, null, 2))
      return
    }

    case "source-probe": {
      const { input, options } = parseSourceProbeArgs(args)
      const result = await sourceProbe(input, options)
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
