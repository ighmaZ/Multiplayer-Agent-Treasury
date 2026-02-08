'use client';

import Typewriter from 'typewriter-effect';

import { AgentProvider, useAgent } from '@/app/components/AgentProvider';
import { ChatInterface } from '@/app/components/chat/ChatInterface';
import {
  ShieldAlert,
  FileText,
  Activity,
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
            <div className="w-full max-w-3xl space-y-12">
              
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
      <MainContent />
    </AgentProvider>
  );
}
