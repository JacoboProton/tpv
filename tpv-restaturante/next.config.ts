import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@tpv/core'],
};

export default withSentryConfig(nextConfig, {
  org: "tpv-comanda",
  project: "javascript-nextjs",
  silent: !process.env.SENTRY_DSN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
