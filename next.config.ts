import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/mcp/oauth-protected-resource",
      },
      {
        source: "/.well-known/openai-apps-challenge",
        destination: "/api/mcp/openai-apps-challenge",
      },
    ];
  },
};

export default nextConfig;
