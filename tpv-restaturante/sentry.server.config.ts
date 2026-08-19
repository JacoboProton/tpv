import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://00c10c313fb64c86a00875f51909fc5f@o4511809014726656.ingest.de.sentry.io/4511809021870160",
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.2,
});