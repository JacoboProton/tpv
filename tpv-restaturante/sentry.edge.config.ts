import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://00c10c313fb64c86a00875f51909fc5f@o4511809014726656.ingest.de.sentry.io/4511809021870160",
  tracesSampleRate: 1.0,
});
