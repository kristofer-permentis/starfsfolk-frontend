import type { NextConfig } from "next";

const basePath = process.env.BASE_PATH ?? "";
const appVariant = process.env.APP_VARIANT ?? "multi";

const config: NextConfig = {
  output: 'standalone',
  basePath,
  trailingSlash: false,
  poweredByHeader: false,
  
  experimental: {
    serverActions: {
      allowedOrigins: ['minarsidur.ngrok.app', 'minarsidur.permentis.is', 'securepay.borgun.is']
    }
  },
  
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_APP_VARIANT: appVariant,
  },
  
  async rewrites() {
    if (appVariant !== "portal") {
      return { beforeFiles: [], afterFiles: [], fallback: [] };
    }
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        { source: "/", destination: "/vefgatt" },
        { source: "/:path*", destination: "/vefgatt/:path*" },
      ],
    };
  },
  
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default config;
