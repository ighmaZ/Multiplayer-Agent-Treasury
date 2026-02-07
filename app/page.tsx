'use client';

import { Toaster } from 'react-hot-toast';
import Typewriter from 'typewriter-effect';

import { Sidebar } from '@/app/components/Sidebar';
import { AgentProvider, useAgent } from '@/app/components/AgentProvider';
import { ChatInterface } from '@/app/components/chat/ChatInterface';
import { 
  Share2, 
  MoreVertical, 
  ChevronDown, 
  Plus, 
  AudioWaveform, 
  ArrowUp,
  BookOpen,
  Laptop,
  Globe,
  ShieldAlert,
  FileText,
  Activity,
  Wallet
} from 'lucide-react';

function Header(): React.JSX.Element {
  const {
    walletAddress,
    connectWallet,
    disconnectWallet,
    isWalletConnecting,
  } = useAgent();
  const walletLabel = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : 'Connect Wallet';

  return (
    <header className="flex h-16 items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (!isWalletConnecting && !walletAddress) {
              void connectWallet();
            }
          }}
          disabled={isWalletConnecting}
          className="group inline-flex items-center gap-3 rounded-full border border-zinc-200 bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-[0_14px_40px_-24px_rgba(0,0,0,0.6)] transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span
            className={`flex h-2.5 w-2.5 rounded-full ${
              walletAddress ? 'bg-emerald-400' : 'bg-zinc-300'
            } shadow-[0_0_0_4px_rgba(204,244,55,0.12)]`}
          />
          <Wallet size={16} className="text-zinc-700 transition-colors group-hover:text-zinc-900" />
          <span className="whitespace-nowrap">
            {isWalletConnecting ? 'Connecting...' : walletLabel}
          </span>
        </button>
        {walletAddress && (
          <button
            onClick={() => {
              void disconnectWallet();
            }}
            className="rounded-full border border-zinc-200/70 px-3 py-1 text-xs font-semibold text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-800"
          >
            Disconnect
          </button>
        )}
      </div>
    </header>
  );
}

function MainContent() {
  const { state: agentState } = useAgent();
  
  // If the agent has state (meaning a file was uploaded or chat started), show the full chat interface
  // modifying the logic to show ChatInterface if active, otherwise show the dashboard
  // The ChatInterface handles its own empty state, but our Dashboard is a nicer "Empty State".
  // let's wrap the Dashboard as the "no state" view.
  
  if (agentState) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-hidden">
           <ChatInterface />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
       <Header />
       <div className="flex flex-1 flex-col items-center justify-center px-4 pb-20 overflow-y-auto">
            <div className="w-full max-w-3xl space-y-12">
              
              {/* Hero Text */}
              <div className="text-center space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
                  Hello!
                </h1>
                  <div className="text-xl font-medium text-zinc-300 sm:text-4xl min-h-[3rem] sm:min-h-0 sm:h-auto">
                    <Typewriter
                      options={{
                        strings: [
                          "Your AI-powered treasury team",
                          "Automated budget checks in seconds",
                          "From 3-5 days to 5 minutes",
                          "Prepares, vets, and schedules transactions",
                          "Your Smart CFO Assistant",
                        ],
                        autoStart: true,
                        loop: true,
                        delay: 50,
                        deleteSpeed: 30,
                      }}
                    />
                  </div>
                </div>

         
            
               
             

              {/* Input Area - We wrap ChatInterface here but styled or just the input part? 
                  Actually, ChatInterface has a FileUpload. 
                  Let's just render ChatInterface but customize it? 
                  Better: Render a customized "Start" area that triggers the same actions.
                  However, ChatInterface logic is internal state. 
                  Let's just render the ChatInterface, but maybe we can't easily style it to look like the dashboard input without refactoring ChatInterface.
                  
                  Alternative: Render the dashboard, and when they interact, we switch to ChatInterface.
                  But ChatInterface requires a file upload to start. 
                  So let's make the dashboard generic input trigger a file upload?
              */}
              
              <div className="relative rounded-2xl bg-white shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)] ring-1 ring-zinc-100 p-6">
                  <div>
                     <ChatInterface />
                  </div>
              </div>

              {/* Cards Grid - Replacing with relevant info */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Card 1 */}
                <div className="group flex flex-col items-start rounded-xl border border-dashed border-zinc-200 bg-white p-5 text-left transition-all hover:border-zinc-300 hover:shadow-sm">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#ccf437] text-black">
                    <FileText size={20} />
                  </div>
                  <h3 className="mb-1 font-semibold text-zinc-900 group-hover:text-black">
                    Invoice Analysis
                  </h3>
                  <p className="text-xs text-zinc-500 leading-snug">
                     Upload PDF invoices to extract extraction wallet addresses and payment details automatically.
                  </p>
                </div>

                {/* Card 2 */}
                <div className="group flex flex-col items-start rounded-xl border border-dashed border-zinc-200 bg-white p-5 text-left transition-all hover:border-zinc-300 hover:shadow-sm">
                   <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#ccf437] text-black">
                    <ShieldAlert size={20} />
                  </div>
                  <h3 className="mb-1 font-semibold text-zinc-900 group-hover:text-black">
                    Security Scan
                  </h3>
                  <p className="text-xs text-zinc-500 leading-snug">
                    Real-time Etherscan checks to identify high-risk wallets and suspicious history.
                  </p>
                </div>

                {/* Card 3 */}
                <div className="group flex flex-col items-start rounded-xl border border-dashed border-zinc-200 bg-white p-5 text-left transition-all hover:border-zinc-300 hover:shadow-sm">
                   <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#ccf437] text-black">
                    <Activity size={20} />
                  </div>
                  <h3 className="mb-1 font-semibold text-zinc-900 group-hover:text-black">
                     Risk Assessment
                  </h3>
                  <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div> Low Risk (0-39)
                      </div>
                       <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <div className="h-2 w-2 rounded-full bg-yellow-500"></div> Medium Risk (40-69)
                      </div>
                       <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div> High Risk (70+)
                      </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
    </div>
  )
}

export default function Home() {
  return (
    <AgentProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2800,
          className:
            'rounded-2xl border border-white/10 bg-zinc-950/95 px-4 py-3 text-sm font-medium text-white shadow-[0_20px_60px_-25px_rgba(0,0,0,0.6)] backdrop-blur',
        }}
      />
      <div className="flex h-screen w-full overflow-hidden bg-black font-sans">
        <Sidebar />
        
        {/* Main Content Area */}
        <main className="flex flex-1 flex-col overflow-hidden bg-white shadow-2xl transition-all md:m-3 md:rounded-[32px] md:border md:border-zinc-200/50">
           <MainContent /> 
        </main>
      </div>
    </AgentProvider>
  );
}
