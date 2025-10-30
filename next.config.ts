import type { NextConfig } from "next";

const basePath   = process.env.BASE_PATH ?? "";
const appVariant = process.env.APP_VARIANT ?? "multi"; // 'portal' for minarsidur/portal build

module.exports = {
  experimental: {
    serverActions: {
      allowedOrigins: ['minarsidur.ngrok.app', 'minarsidur.permentis.is', 'securepay.borgun.is']
    }
  }
}

const config: NextConfig = {
  basePath,
  trailingSlash: false,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_APP_VARIANT: appVariant,
  },
  async rewrites() {
    if (appVariant !== "portal") {
      // Multi-app build: NO rewrites — vefgatt lives at /vefgatt via its folder
      return { beforeFiles: [], afterFiles: [], fallback: [] };
    }
    // Portal build: only rewrite when nothing matched (so /favicon.ico, etc. are untouched)
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        { source: "/",       destination: "/vefgatt" },
        { source: "/:path*", destination: "/vefgatt/:path*" },
      ],
    };
  },
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default config;
