import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure LangGraph and other Node.js modules work properly
  serverExternalPackages: ['@langchain/langgraph', '@langchain/core', 'pdf-parse'],
};

export default nextConfig;
