import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { GenericSupabaseClient } from "../clients/supabase.js"
import type { PipelineConfig } from "../config/env.js"
import type { Logger } from "../core/logger.js"
import type { StoredCandidate } from "./repository.js"

const toJsonl = (rows: StoredCandidate[]): string =>
  rows.map((row) => JSON.stringify(row)).join("\n")

export interface SnapshotWriter {
  writeRunSnapshot: (params: {
    runId: string
    sourceKey: string
    candidates: StoredCandidate[]
  }) => Promise<string>
}

export function createSnapshotWriter(
  config: PipelineConfig,
  logger: Logger,
  ingestClient?: GenericSupabaseClient
): SnapshotWriter {
  if (config.ingestSnapshotMode === "supabase") {
    if (!ingestClient) {
      throw new Error("Supabase snapshot mode requires ingestion Supabase client")
    }
    return {
      async writeRunSnapshot({ runId, sourceKey, candidates }) {
        const body = toJsonl(candidates)
        const path = `${sourceKey}/${runId}.jsonl`
        const { error } = await ingestClient.storage
          .from(config.ingestSnapshotBucket)
          .upload(path, body, {
            contentType: "application/x-ndjson",
            upsert: true,
          })

        if (error) {
          throw new Error(`Failed to upload snapshot to bucket: ${error.message}`)
        }

        logger.info("Uploaded run snapshot", {
          mode: "supabase",
          bucket: config.ingestSnapshotBucket,
          path,
          candidates: candidates.length,
        })
        return `supabase://${config.ingestSnapshotBucket}/${path}`
      },
    }
  }

  return {
    async writeRunSnapshot({ runId, sourceKey, candidates }) {
      const dir = join(config.ingestSnapshotLocalDir, sourceKey)
      await mkdir(dir, { recursive: true })
      const file = join(dir, `${runId}.jsonl`)
      await writeFile(file, `${toJsonl(candidates)}\n`, "utf8")
      logger.info("Wrote run snapshot", {
        mode: "local",
        file,
        candidates: candidates.length,
      })
      return file
    },
  }
}
