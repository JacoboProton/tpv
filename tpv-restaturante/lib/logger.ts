// lib/logger.ts
import { pino } from "pino";
import * as Sentry from "@sentry/nextjs";

// Configure Pino logger
const logger = pino({
  level: process.env.PINO_LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  base: {}, // omit pid, hostname
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: { paths: ["req.headers.authorization"], censor: "***" },
});

// Correlation ID handling
let correlationId: string | undefined;
export function setCorrelationId(id: string) {
  correlationId = id;
}

function enrich(obj: Record<string, unknown> = {}) {
  if (correlationId) obj["correlationId"] = correlationId;
  return obj;
}

export function logInfo(message: string, data?: Record<string, unknown>) {
  logger.info(enrich(data), message);
}
export function logDebug(message: string, data?: Record<string, unknown>) {
  logger.debug(enrich(data), message);
}
export function logWarn(message: string, data?: Record<string, unknown>) {
  logger.warn(enrich(data), message);
}
export function logError(message: string, data?: Record<string, unknown>) {
  logger.error(enrich(data), message);
}

// Forward all logs as Sentry breadcrumbs
logger.addHook("log", (log) => {
  const { level, msg, ...rest } = log;
  Sentry.addBreadcrumb({
    category: "log",
    level: level as any,
    message: msg,
    data: rest,
  });
});

export default logger;
