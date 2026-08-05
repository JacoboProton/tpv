import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@tpv/core'],
};

const analyzedConfig = process.env.ANALYZE === 'true'
  ? withBundleAnalyzer({ enabled: true })(nextConfig)
  : nextConfig;

export default withSentryConfig(analyzedConfig, {
  org: "tpv-comanda",
  project: "javascript-nextjs",
  silent: !process.env.SENTRY_DSN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
