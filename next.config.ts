import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not auto-generate AGENTS.md / CLAUDE.md at the project root.
  agentRules: false,
};

export default nextConfig;
