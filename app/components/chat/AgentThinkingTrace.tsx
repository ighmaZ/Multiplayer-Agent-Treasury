// components/chat/AgentThinkingTrace.tsx
// Beautiful real-time AI thinking visualization with typewriter effect

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ShieldCheck, Brain, CheckCircle2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { ThinkingLog } from '@/app/lib/agents/state';

interface AgentThinkingTraceProps {
  logs: ThinkingLog[];
  isStreaming: boolean;
  onComplete?: () => void;
}

interface LogEntryProps {
  log: ThinkingLog;
  isLatest: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  isTyping: boolean;
}

// Typewriter hook for smooth text animation
function useTypewriter(text: string, speed: number = 20, startTyping: boolean = true) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!startTyping) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    indexRef.current = 0;
    setDisplayedText('');
    setIsComplete(false);

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, startTyping]);

  return { displayedText, isComplete };
}

// Animated typing cursor
function TypingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 align-middle"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// Step icon with animation
function StepIcon({ icon, status }: { icon: ThinkingLog['icon']; status: ThinkingLog['status'] }) {
  const iconMap = {
    file: FileText,
    shield: ShieldCheck,
    brain: Brain,
    check: CheckCircle2,
  };

  const Icon = iconMap[icon];

  const getStatusColor = () => {
    switch (status) {
      case 'thinking':
      case 'processing':
        return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30';
      case 'success':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'error':
        return 'text-rose-400 bg-rose-400/10 border-rose-400/30';
      default:
        return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';
    }
  };

  return (
    <motion.div
      className={`flex items-center justify-center w-8 h-8 rounded-lg border ${getStatusColor()} transition-colors duration-300`}
      animate={status === 'thinking' || status === 'processing' ? {
        scale: [1, 1.05, 1],
        boxShadow: [
          '0 0 0 0 rgba(34, 211, 238, 0)',
          '0 0 20px 4px rgba(34, 211, 238, 0.3)',
          '0 0 0 0 rgba(34, 211, 238, 0)'
        ]
      } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {status === 'thinking' || status === 'processing' ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
    </motion.div>
  );
}

// Individual log entry component with stable layout
function LogEntry({ log, isLatest, isExpanded, onToggle, isTyping }: LogEntryProps) {
  const { displayedText, isComplete } = useTypewriter(
    log.reasoning,
    25,
    isLatest && isTyping
  );
  
  const textRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll text container to bottom as content grows
  useEffect(() => {
    if (textRef.current && isLatest && isTyping) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [displayedText, isLatest, isTyping]);

  const getStatusIndicator = () => {
    switch (log.status) {
      case 'thinking':
        return (
          <span className="flex items-center gap-1.5 text-xs text-cyan-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            Analyzing
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1.5 text-xs text-cyan-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'success':
        return <span className="text-xs text-emerald-400">Completed</span>;
      case 'error':
        return <span className="text-xs text-rose-400">Failed</span>;
      default:
        return <span className="text-xs text-zinc-400">Pending</span>;
    }
  };

  return (
    <div className="relative">
      {/* Timeline connector */}
      <div className="absolute left-4 top-10 bottom-0 w-px bg-gradient-to-b from-zinc-700/50 to-transparent" />

      <div className="flex gap-4">
        {/* Icon */}
        <div className="relative z-10 flex-shrink-0">
          <StepIcon icon={log.icon} status={log.status} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-zinc-200">{log.title}</h4>
              {getStatusIndicator()}
            </div>
            {log.details && log.details.length > 0 && (
              <button
                onClick={onToggle}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {isExpanded ? 'Less' : 'More'}
              </button>
            )}
          </div>

          {/* Reasoning text - FIXED HEIGHT with scroll */}
          <div 
            ref={textRef}
            className="text-sm text-zinc-400 leading-relaxed h-[4.5rem] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
            style={{ contain: 'strict' }}
          >
            <span className="font-mono text-zinc-500">&gt; </span>
            <span className="break-words whitespace-pre-wrap">{displayedText}</span>
            {isLatest && isTyping && !isComplete && <TypingCursor />}
          </div>

          {/* Expandable details */}
          {isExpanded && log.details && log.details.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <ul className="space-y-1.5">
                {log.details.map((detail, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-zinc-500 flex items-start gap-2"
                  >
                    <span className="text-zinc-600 mt-0.5">•</span>
                    <span className="font-mono">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Summary line component (collapsed state)
function SummaryLine({ logs, isStreaming, onExpand }: { logs: ThinkingLog[]; isStreaming: boolean; onExpand: () => void }) {
  const latestLog = logs[logs.length - 1];
  const completedSteps = logs.filter(l => l.status === 'success').length;
  const totalSteps = 3;

  if (!latestLog) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 cursor-pointer hover:bg-zinc-900/70 transition-colors"
      onClick={onExpand}
    >
      {/* Animated indicator */}
      <div className="flex-shrink-0">
        {isStreaming ? (
          <div className="relative flex h-6 w-6">
            <motion.div
              className="absolute inset-0 rounded-full bg-cyan-500/20"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </div>
          </div>
        ) : (
          <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
            logs.some(l => l.status === 'error')
              ? 'bg-rose-500/20 text-rose-400'
              : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {logs.some(l => l.status === 'error') ? (
              <span className="text-xs">!</span>
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 truncate">
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <span className="animate-pulse">Thinking</span>
              <span className="text-zinc-500">
                {latestLog.title}...
              </span>
            </span>
          ) : (
            <span>
              Analysis complete • {completedSteps}/{totalSteps} steps
            </span>
          )}
        </p>
      </div>

      {/* Expand icon */}
      <ChevronDown className="w-4 h-4 text-zinc-500" />
    </motion.div>
  );
}

// Main component
export function AgentThinkingTrace({ logs, isStreaming, onComplete }: AgentThinkingTraceProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive (debounced to reduce flickering)
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    }
  }, [logs.length, isExpanded]);

  // Collapse automatically when streaming completes
  useEffect(() => {
    if (!isStreaming && logs.length > 0) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, logs.length]);

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  if (logs.length === 0) return null;

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SummaryLine
              logs={logs}
              isStreaming={isStreaming}
              onExpand={() => setIsExpanded(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                AI Agent Reasoning
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
              >
                Collapse
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Logs container */}
            <div
              ref={scrollRef}
              className="max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
              style={{ 
                contain: 'layout style',
                scrollBehavior: 'smooth',
                overflowAnchor: 'none'
              }}
            >
              {logs.map((log, index) => (
                <LogEntry
                  key={log.id}
                  log={log}
                  isLatest={index === logs.length - 1}
                  isExpanded={expandedLogs.has(log.id)}
                  onToggle={() => toggleLogExpansion(log.id)}
                  isTyping={isStreaming}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgentThinkingTrace;
