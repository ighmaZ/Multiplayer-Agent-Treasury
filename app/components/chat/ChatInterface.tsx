// components/chat/ChatInterface.tsx
// Main chat interface component with streaming support

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Send, Plus, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { MessageList } from './MessageList';
import { AgentThinkingTrace } from './AgentThinkingTrace';
import { ChatMessages } from './ChatMessages';
import { useAgent } from '../AgentProvider';
import { ThinkingLog } from '@/app/lib/agents/state';
import { ExecutionStep } from '@/app/lib/services/treasuryManager';
import type { ChatHistoryMessage, ChatMessage } from '@/app/types/chat';

const ANALYSIS_TRIGGER_PATTERN = /\b(analy[sz]e|analysis|review|scan|audit|check|process|summari[sz]e|extract|evaluate)\b/i;

function shouldTriggerAnalysis(message: string): boolean {
  return ANALYSIS_TRIGGER_PATTERN.test(message);
}

function createChatMessage(role: ChatMessage['role'], content: string): ChatMessage {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function ChatInterface(): React.JSX.Element {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const {
    state: agentState,
    setState: setAgentState,
    isLoading,
    setIsLoading,
  } = useAgent();
  const [thinkingLogs, setThinkingLogs] = useState<ThinkingLog[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionDone, setExecutionDone] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const showToast = useCallback((message: string): void => {
    toast(message, {
      icon: (
        <span className="h-2.5 w-2.5 rounded-full bg-[#ccf437] shadow-[0_0_0_4px_rgba(204,244,55,0.15)]" />
      ),
    });
  }, []);

  const appendChatMessage = useCallback((message: ChatMessage): void => {
    setChatMessages(prev => [...prev, message]);
  }, []);

  const buildChatHistory = useCallback((messages: ChatMessage[]): ChatHistoryMessage[] => {
    return messages.slice(-10).map(({ role, content }) => ({ role, content }));
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
                        // Preserve stable id to avoid remount/flicker
                        updated[existingIndex] = {
                          ...data,
                          id: prev[existingIndex].id,
                        };
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
        payerAddress: null,
        currentStep: 'error',
        invoiceData: null,
        securityScan: null,
        paymentPlan: null,
        recommendation: null,
        treasuryPlan: null,
        logs: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleSendMessage = async (): Promise<void> => {
    if (isChatLoading || isLoading) return;

    const trimmedMessage = messageInput.trim();

    if (!trimmedMessage) {
      if (selectedFile && !isStreaming && !isLoading) {
        await handleSubmit();
      }
      return;
    }

    const userMessage = createChatMessage('user', trimmedMessage);
    appendChatMessage(userMessage);
    setMessageInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMessage,
          hasFile: Boolean(selectedFile),
          fileName: selectedFile?.name ?? null,
          history: buildChatHistory([...chatMessages, userMessage]),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      const reply = typeof data.reply === 'string' ? data.reply : 'I ran into an issue responding.';

      appendChatMessage(createChatMessage('assistant', reply));
    } catch (error) {
      console.error('❌ Chat request failed:', error);
      appendChatMessage(
        createChatMessage('assistant', 'Sorry, I had trouble responding. Please try again.')
      );
    } finally {
      setIsChatLoading(false);
    }

    if (shouldTriggerAnalysis(trimmedMessage) && selectedFile && !isStreaming && !isLoading) {
      await handleSubmit();
    }
  };

  const handleApprove = async () => {
    if (!agentState?.treasuryPlan?.canExecute) return;

    setIsApproving(true);
    setIsExecuting(true);
    // Initialize execution steps from the plan
    setExecutionSteps(agentState.treasuryPlan.steps.map(s => ({ ...s })));

    try {
      const response = await fetch('/api/treasury/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treasuryPlan: agentState.treasuryPlan }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Execution failed');
      }

      // Handle SSE streaming of execution progress
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to read execution stream');

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
                  case 'step_update':
                    setExecutionSteps(prev =>
                      prev.map(s =>
                        s.id === data.stepId
                          ? { ...s, ...data }
                          : s
                      )
                    );
                    break;

                  case 'execution_complete':
                    showToast('Payment executed successfully');
                    setIsExecuting(false);
                    setExecutionDone(true);
                    break;

                  case 'execution_error':
                    throw new Error(data.error || 'Execution failed');
                }
              } catch (e) {
                if (e instanceof Error && e.message !== 'Execution failed') {
                  console.error('Failed to parse execution SSE:', e);
                } else {
                  throw e;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Execution failed:', error);
      showToast(error instanceof Error ? error.message : 'Execution failed');
      setIsExecuting(false);
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
    setExecutionSteps([]);
    setIsExecuting(false);
    setExecutionDone(false);
  }, [setAgentState, setIsLoading]);

  return (
      <div className="flex bg-transparent h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <ChatMessages messages={chatMessages} isTyping={isChatLoading} />
          </div>
        )}

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
              executionSteps={executionSteps.length > 0 ? executionSteps : undefined}
              isExecuting={isExecuting}
              executionDone={executionDone}
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
              placeholder={selectedFile
                ? `Ask about ${selectedFile.name} or say \"analyze\" to start...`
                : 'Ask me to review an invoice or upload a PDF...'}
              value={messageInput}
              onChange={event => setMessageInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSendMessage();
                }
              }}
              className="flex-1 bg-transparent px-2 text-base md:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none min-w-0"
              disabled={isChatLoading || isLoading}
            />

            {/* Send/Analyze Button */}
            <button
              onClick={handleSendMessage}
              disabled={isChatLoading || isLoading || (!selectedFile && messageInput.trim().length === 0)}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all
                ${(isChatLoading || isLoading || (!selectedFile && messageInput.trim().length === 0))
                  ? 'bg-black text-zinc-300'
                  : 'bg-black text-white hover:bg-zinc-800'
                }
              `}
            >
              {isLoading || isChatLoading ? (
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
