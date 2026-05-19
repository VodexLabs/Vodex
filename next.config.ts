import type { NextConfig } from "next";
import path from "node:path";

/** Real app root — prevents Next from treating `C:\Users\XenoD\Desktop` as the workspace. */
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
