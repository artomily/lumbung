import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/treasury",
        destination: "/app",
        permanent: false,
      },
      {
        source: "/decisions",
        destination: "/app/decisions",
        permanent: false,
      },
      {
        source: "/decisions/:id",
        destination: "/app/decisions/:id",
        permanent: false,
      },
      {
        source: "/approvals",
        destination: "/app/approvals",
        permanent: false,
      },
      {
        source: "/metrics",
        destination: "/app/metrics",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
