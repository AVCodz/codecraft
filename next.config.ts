import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://*.proxy.daytona.works https://*.daytona.io;",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Don't bundle monaco-editor on the server
    if (isServer) {
      return config;
    }

    // Configure Monaco Editor for client-side
    config.module.rules.push({
      test: /\.ttf$/,
      type: 'asset/resource',
    });

    return config;
  },
};

export default nextConfig;
