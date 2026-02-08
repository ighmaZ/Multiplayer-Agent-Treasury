'use client';

import Typewriter from 'typewriter-effect';

import { AgentProvider, useAgent } from '@/app/components/AgentProvider';
import { ChatInterface } from '@/app/components/chat/ChatInterface';
import {
  ShieldAlert,
  FileText,
  CreditCard,
  PieChart,
  ArrowRight,
} from 'lucide-react';

function MainContent() {
  const { state: agentState } = useAgent();
  
  // If the agent has state (meaning a file was uploaded or chat started), show the full chat interface
  // modifying the logic to show ChatInterface if active, otherwise show the dashboard
  // The ChatInterface handles its own empty state, but our Dashboard is a nicer "Empty State".
  // let's wrap the Dashboard as the "no state" view.
  
  if (agentState) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
           <ChatInterface />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
       <div className="flex flex-1 flex-col items-center justify-center px-4 pb-20 overflow-y-auto">
            <div className="w-full max-w-6xl space-y-16">
              
              {/* Hero Text */}
              <div className="text-center space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
                  Tresora.fi
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
              
              <div className="relative max-w-3xl mx-auto rounded-2xl bg-white shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)] ring-1 ring-zinc-100 p-6">
                  <div>
                     <ChatInterface />
                  </div>
              </div>

              {/* Cards Grid - Replacing with relevant info */}
              {/* Cards Flow */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                
                {/* Card 1: Invoice Analysis */}
                <div className="group flex flex-1 flex-col items-start rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-left transition-all hover:border-zinc-300 hover:shadow-md">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ccf437] text-black shadow-sm">
                    <FileText size={24} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 group-hover:text-black">
                    Invoice Analysis
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                     Upload PDF invoices to extract wallet addresses and payment details automatically.
                  </p>
                </div>

                <div className="hidden sm:block text-zinc-300">
                  <ArrowRight size={24} strokeWidth={1.5} />
                </div>
                {/* Mobile arrow */}
                <div className="block sm:hidden text-zinc-300 self-center transform rotate-90 my-[-10px]">
                   <ArrowRight size={24} strokeWidth={1.5} />
                </div>

                {/* Card 2: Security Scan */}
                <div className="group flex flex-1 flex-col items-start rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-left transition-all hover:border-zinc-300 hover:shadow-md">
                   <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ccf437] text-black shadow-sm">
                    <ShieldAlert size={24} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 group-hover:text-black">
                    Security Scan
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Real-time Etherscan checks to identify high-risk wallets and suspicious history.
                  </p>
                </div>

                <div className="hidden sm:block text-zinc-300">
                  <ArrowRight size={24} strokeWidth={1.5} />
                </div>
                 {/* Mobile arrow */}
                <div className="block sm:hidden text-zinc-300 self-center transform rotate-90 my-[-10px]">
                   <ArrowRight size={24} strokeWidth={1.5} />
                </div>

                {/* Card 3: Budget Check */}
                <div className="group flex flex-1 flex-col items-start rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-left transition-all hover:border-zinc-300 hover:shadow-md">
                   <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ccf437] text-black shadow-sm">
                    <PieChart size={24} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 group-hover:text-black">
                    Budget Check
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Verify account balances and approve spending limits against department budgets.
                  </p>
                </div>

                <div className="hidden sm:block text-zinc-300">
                  <ArrowRight size={24} strokeWidth={1.5} />
                </div>
                 {/* Mobile arrow */}
                <div className="block sm:hidden text-zinc-300 self-center transform rotate-90 my-[-10px]">
                   <ArrowRight size={24} strokeWidth={1.5} />
                </div>

                {/* Card 4: Smart Payments */}
                <div className="group flex flex-1 flex-col items-start rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-left transition-all hover:border-zinc-300 hover:shadow-md">
                   <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ccf437] text-black shadow-sm">
                    <CreditCard size={24} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 group-hover:text-black">
                     Smart Payments
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                     CFO sign and execute transaction smartly.
                  </p>
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
      <MainContent />
    </AgentProvider>
  );
}
