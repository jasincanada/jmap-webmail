import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: import.meta.dirname,
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
