// components/chat/ChatInterface.tsx
// Main chat interface component

'use client';

import { useState } from 'react';
import { FileUpload } from './FileUpload';
import { MessageList } from './MessageList';
import { Send, Plus, FileText } from 'lucide-react';
import { useAgent } from '../AgentProvider';

export function ChatInterface() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { state: agentState, setState: setAgentState, isLoading, setIsLoading } = useAgent();

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

    setIsLoading(true);
    setAgentState(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

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
      <div className="flex bg-transparent h-full flex-col">
      {/* Messages Area */}
      {agentState && agentState.logs.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4">
            <MessageList state={agentState} isLoading={isLoading} />
          </div>
      )}

      {/* Input Area */}
      <div className="bg-transparent p-4 mt-auto">
        <div className="mx-auto max-w-2xl">
          <div className="relative flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-zinc-100 focus-within:ring-2 focus-within:ring-[#ccf437] transition-all">
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
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors
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
              className="flex-1 bg-transparent px-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              disabled={isLoading}
            />

            {/* Send/Analyze Button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || isLoading}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all
                ${!selectedFile || isLoading
                  ? 'bg-zinc-100 text-zinc-300'
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
          
          {selectedFile && !agentState && (
             <div className="mt-2 text-center">
                <span className="text-xs text-zinc-400">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB) ready for upload
                </span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
