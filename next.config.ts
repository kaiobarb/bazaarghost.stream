import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // output: "export", // Forces static HTML export
  // images: { unoptimized: true },
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  images: {
    // 1 year cache TTL for Twitch avatars to reduce image transformations
    minimumCacheTTL: 31536000, // 365 days in seconds
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static-cdn.jtvnw.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.twitch.tv",
        pathname: "/**",
      },
    ],
  },
};

const withMDX = createMDX({
  // Markdown options
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
