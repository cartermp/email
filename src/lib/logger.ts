import pino from "pino";

/**
 * Structured logger. Outputs newline-delimited JSON in all environments.
 * Set LOG_LEVEL env var to override (default: "info").
 *
 * In development, pipe through `pino-pretty` for human-readable output:
 *   pnpm dev | pnpm dlx pino-pretty
 */
export const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "email" },
  timestamp: pino.stdTimeFunctions.isoTime,
});
