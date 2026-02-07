// components/chat/ChatInterface.tsx
// Main chat interface component with streaming support

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Send, Plus, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MessageList } from './MessageList';
import { AgentThinkingTrace } from './AgentThinkingTrace';
import { useAgent } from '../AgentProvider';
import { ThinkingLog } from '@/app/lib/agents/state';

export function ChatInterface(): React.JSX.Element {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const {
    state: agentState,
    setState: setAgentState,
    isLoading,
    setIsLoading,
    walletAddress,
    ensureWalletNetwork,
  } = useAgent();
  const [thinkingLogs, setThinkingLogs] = useState<ThinkingLog[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const showToast = useCallback((message: string): void => {
    toast(message, {
      icon: (
        <span className="h-2.5 w-2.5 rounded-full bg-[#ccf437] shadow-[0_0_0_4px_rgba(204,244,55,0.15)]" />
      ),
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file');
        return;
      }
      setSelectedFile(file);
      setAgentState(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    if (!walletAddress) {
      showToast('Connect wallet first');
      return;
    }

    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsLoading(true);
    setIsStreaming(true);
    setAgentState(null);
    setThinkingLogs([]);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('payerAddress', walletAddress);

      // Use streaming API
      const response = await fetch('/api/agents/stream', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start analysis');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to initialize stream reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim().startsWith('event: ')) {
            const eventType = line.replace('event: ', '').split('\n')[0];
            const dataMatch = line.match(/data: (.+)/);
            
            if (dataMatch) {
              try {
                const data = JSON.parse(dataMatch[1]);

                switch (eventType) {
                  case 'thinking':
                    setThinkingLogs(prev => {
                      // Update existing log or add new one
                      const existingIndex = prev.findIndex(l => l.step === data.step);
                      if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = data;
                        return updated;
                      }
                      return [...prev, data];
                    });
                    break;

                  case 'complete':
                    setAgentState(data);
                    setIsStreaming(false);
                    setIsLoading(false);
                    break;

                  case 'error':
                    throw new Error(data.error || 'Analysis failed');
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Error processing invoice:', error);
      setIsStreaming(false);
      setIsLoading(false);
      setAgentState({
        pdfBuffer: null,
        fileName: selectedFile.name,
        payerAddress: walletAddress,
        currentStep: 'error',
        invoiceData: null,
        securityScan: null,
        paymentPlan: null,
        recommendation: null,
        logs: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleApprove = async () => {
    if (!agentState?.paymentPlan?.preparedTransaction || !walletAddress) {
      if (!walletAddress) {
        showToast('Connect wallet first');
      }
      return;
    }

    setIsApproving(true);
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is required to approve transactions');
      }

      await ensureWalletNetwork();

      const tx = {
        from: walletAddress,
        to: agentState.paymentPlan.preparedTransaction.to,
        data: agentState.paymentPlan.preparedTransaction.data,
        value: agentState.paymentPlan.preparedTransaction.value,
      };

      const hash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [tx],
      }) as string;

      setAgentState(prev =>
        prev && prev.paymentPlan
          ? {
              ...prev,
              paymentPlan: {
                ...prev.paymentPlan,
                submittedTxHash: hash as string,
              },
            }
          : prev
      );
    } catch (error) {
      console.error('Approval failed:', error);
      alert(error instanceof Error ? error.message : 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  const clearAnalysis = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setSelectedFile(null);
    setAgentState(null);
    setThinkingLogs([]);
    setIsStreaming(false);
    setIsLoading(false);
  }, [setAgentState, setIsLoading]);

  return (
      <div className="flex bg-transparent h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Thinking Trace - Real-time AI reasoning */}
        {(thinkingLogs.length > 0 || isStreaming) && (
          <div className="max-w-2xl mx-auto">
            <AgentThinkingTrace
              logs={thinkingLogs}
              isStreaming={isStreaming}
            />
          </div>
        )}

        {/* Results */}
        {agentState && agentState.currentStep === 'complete' && (
          <div className="max-w-2xl mx-auto">
            <MessageList
              state={agentState}
              isLoading={isLoading}
              onApprove={handleApprove}
              isApproving={isApproving}
            />
          </div>
        )}

        {/* Error State */}
        {agentState && agentState.currentStep === 'error' && (
          <div className="max-w-2xl mx-auto p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-sm text-rose-400">{agentState.error}</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-transparent p-2 md:p-4 mt-auto">
        <div className="mx-auto max-w-2xl">
            <div className="relative flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-zinc-400 focus-within:ring-2 focus-within:ring-[#ccf437] transition-all">
            {/* File Upload Trigger */}
            <div className="relative">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 cursor-pointer opacity-0"
                disabled={isLoading}
                id="file-upload"
              />
              <div 
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors
                  ${selectedFile 
                    ? 'bg-[#ccf437] text-black' 
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
              >
                {selectedFile ? <FileText size={20} /> : <Plus size={20} />}
              </div>
            </div>

            {/* Input Field */}
            <input
              type="text"
              placeholder={selectedFile ? `Ready to analyze ${selectedFile.name}...` : "Upload an invoice to get started..."}
              className="flex-1 bg-transparent px-2 text-base md:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none min-w-0"
              disabled={isLoading}
            />

            {/* Send/Analyze Button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || isLoading}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all
                ${!selectedFile || isLoading
                  ? 'bg-black text-zinc-300'
                  : 'bg-black text-white hover:bg-zinc-800'
                }
              `}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          
              {selectedFile && (
              <div className="mt-2 flex items-center justify-center gap-3">
                 <span className="text-xs text-zinc-400">
                   {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                 </span>
                 {(agentState || thinkingLogs.length > 0) && (
                   <button
                     onClick={clearAnalysis}
                     className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                   >
                     Clear
                   </button>
                 )}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
