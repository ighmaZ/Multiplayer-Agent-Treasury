// page.tsx
// Main page for CFO Agent App

import { ChatInterface } from '@/app/components/chat/ChatInterface';
import { AgentProvider } from '@/app/components/AgentProvider';

export default function Home() {
  return (
    <AgentProvider>
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
        {/* Header */}
        <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                CFO Agent
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                AI-powered invoice analysis & wallet security scanner
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-zinc-500">System Online</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
            {/* Chat Interface */}
            <div className="flex h-[600px] flex-col rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Chat
                </h2>
              </div>
              <div className="flex-1">
                <ChatInterface />
              </div>
            </div>

            {/* Agent Trace Visualization */}
            <div className="space-y-6">
          
              {/* Info Cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    How it works
                  </h3>
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <li>1. Upload invoice PDF</li>
                    <li>2. AI extracts wallet address</li>
                    <li>3. Security scan via Etherscan</li>
                    <li>4. Get CFO recommendation</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Risk Levels
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-zinc-600 dark:text-zinc-400">0-39: Low Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <span className="text-zinc-600 dark:text-zinc-400">40-69: Medium Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span className="text-zinc-600 dark:text-zinc-400">70+: High Risk</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AgentProvider>
  );
}
