// lib/logger.ts
import { pino } from "pino";
import * as Sentry from "@sentry/nextjs";

const SENTRY_LEVEL: Record<number, Sentry.Breadcrumb["level"]> = {
  10: "debug",
  20: "debug",
  30: "info",
  40: "warning",
  50: "error",
  60: "fatal",
};

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
  // Forward all logs as Sentry breadcrumbs
  hooks: {
    logMethod(args, method, level) {
      const last = args[args.length - 1];
      const message = typeof last === "string" ? last : "";
      const data =
        typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0])
          ? args[0]
          : undefined;
      Sentry.addBreadcrumb({
        category: "log",
        level: SENTRY_LEVEL[level] ?? "info",
        message,
        data,
      });
      return method.apply(this, args);
    },
  },
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
// Forward all logs as Sentry breadcrumbs
export function logWarn(message: string, data?: Record<string, unknown>) {
  logger.warn(enrich(data), message);
}
export function logError(message: string, data?: Record<string, unknown>) {
  logger.error(enrich(data), message);
}

export default logger;
