// components/chat/ChatInterface.tsx
// Main chat interface component

'use client';

import { useState } from 'react';
import { FileUpload } from './FileUpload';
import { MessageList } from './MessageList';
import { Send } from 'lucide-react';
import { useAgent } from '../AgentProvider';

export function ChatInterface() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { state: agentState, setState: setAgentState, isLoading, setIsLoading } = useAgent();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setAgentState(null);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setAgentState(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Call the API route
      const response = await fetch('/api/agents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process invoice');
      }

      setAgentState(data.state);
    } catch (error) {
      console.error('Error processing invoice:', error);
      setAgentState({
        pdfBuffer: null,
        fileName: selectedFile.name,
        currentStep: 'error',
        invoiceData: null,
        securityScan: null,
        recommendation: null,
        logs: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList state={agentState} isLoading={isLoading} />
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-2xl space-y-4">
          <FileUpload 
            onFileSelect={handleFileSelect} 
            disabled={isLoading}
          />

          {selectedFile && !agentState && (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`
                flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium
                ${isLoading 
                  ? 'cursor-not-allowed bg-zinc-300 text-zinc-500' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Analyze Invoice
                </>
              )}
            </button>
          )}

          {agentState && (
            <button
              onClick={() => {
                setSelectedFile(null);
                setAgentState(null);
              }}
              className="w-full rounded-lg border border-zinc-300 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Upload New Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
