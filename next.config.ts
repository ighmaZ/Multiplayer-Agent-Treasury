import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure LangGraph and other Node.js modules work properly
  serverExternalPackages: ['@langchain/langgraph', '@langchain/core', 'pdf-parse', '@circle-fin/developer-controlled-wallets'],
};

export default nextConfig;
