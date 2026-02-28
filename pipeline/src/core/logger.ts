export type LogLevel = "debug" | "info" | "warn" | "error"

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export interface Logger {
  debug: (message: string, meta?: unknown) => void
  info: (message: string, meta?: unknown) => void
  warn: (message: string, meta?: unknown) => void
  error: (message: string, meta?: unknown) => void
}

const serializeMeta = (meta: unknown): string => {
  if (meta === undefined) return ""
  try {
    return ` ${JSON.stringify(meta)}`
  } catch {
    return " [unserializable-meta]"
  }
}

export function createLogger(level: LogLevel = "info", scope = "pipeline"): Logger {
  const threshold = LEVEL_PRIORITY[level]

  const shouldLog = (candidate: LogLevel) => LEVEL_PRIORITY[candidate] >= threshold

  const write = (candidate: LogLevel, message: string, meta?: unknown) => {
    if (!shouldLog(candidate)) return
    const line = `[${new Date().toISOString()}] [${scope}] [${candidate}] ${message}${serializeMeta(meta)}`
    if (candidate === "error") {
      console.error(line)
      return
    }
    if (candidate === "warn") {
      console.warn(line)
      return
    }
    console.log(line)
  }

  return {
    debug: (message, meta) => write("debug", message, meta),
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
  }
}
