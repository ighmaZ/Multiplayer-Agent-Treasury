// components/chat/FileUpload.tsx
// PDF file upload component with drag and drop

'use client';

import { useState, useCallback } from 'react';
import { Upload, File, X } from 'lucide-react';
import { validatePDFFile, formatFileSize } from '@/app/lib/services/pdfService';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    setError(null);
    
    const validation = validatePDFFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  if (selectedFile) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <File className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {selectedFile.name}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={clearFile}
              className="rounded-full p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4 text-zinc-500" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-lg border-2 border-dashed p-8 transition-colors
        ${isDragging 
          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950' 
          : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileInput}
        disabled={disabled}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Upload className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
        </div>
        
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Drop your invoice PDF here
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            or click to browse (max 10MB)
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-center text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
