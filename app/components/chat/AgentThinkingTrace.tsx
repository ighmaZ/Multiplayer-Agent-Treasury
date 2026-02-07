// components/chat/AgentThinkingTrace.tsx
// Real-time AI thinking visualization with stable typewriter effect

'use client';

import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ShieldCheck, Brain, CheckCircle2, ChevronDown, ChevronUp, Wallet } from 'lucide-react';
import { ThinkingLog } from '@/app/lib/agents/state';

interface AgentThinkingTraceProps {
  logs: ThinkingLog[];
  isStreaming: boolean;
  onComplete?: () => void;
}

// Icon component matching app design
const StepIcon = memo(function StepIcon({ 
  icon, 
  status 
}: { 
  icon: ThinkingLog['icon']; 
  status: ThinkingLog['status'];
}) {
  const iconMap = {
    file: FileText,
    shield: ShieldCheck,
    wallet: Wallet,
    brain: Brain,
    check: CheckCircle2,
  };

  const Icon = iconMap[icon];
  const isActive = status === 'thinking' || status === 'processing';
  const isComplete = status === 'success';
  const isError = status === 'error';

  return (
    <div className={`
      flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300
      ${isComplete 
        ? 'bg-green-100 text-green-600' 
        : isError
        ? 'bg-red-100 text-red-600'
        : isActive
        ? 'bg-[#ccf437]/20 text-zinc-700'
        : 'bg-zinc-100 text-zinc-500'
      }
    `}>
      {isActive ? (
        <div className="relative">
          <Icon className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#ccf437] animate-pulse" />
        </div>
      ) : (
        <Icon className="h-4 w-4" />
      )}
    </div>
  );
});

// Stable typewriter hook - NEVER re-animates already shown text
function useStableTypewriter(text: string, isStreaming: boolean, speed: number = 15) {
  // Track how much text we've already displayed (persists across renders)
  const displayedLengthRef = useRef(0);
  const [displayedText, setDisplayedText] = useState('');
  const rafRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    // If not streaming, show all text immediately
    if (!isStreaming) {
      setDisplayedText(text);
      displayedLengthRef.current = text.length;
      return;
    }

    // If text shrunk (new step started), reset
    if (text.length < displayedLengthRef.current) {
      displayedLengthRef.current = 0;
      setDisplayedText('');
    }

    // Already caught up - nothing to animate
    if (displayedLengthRef.current >= text.length) {
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      
      const elapsed = timestamp - lastTimeRef.current;
      
      if (elapsed >= speed) {
        // Calculate how many characters to add
        const charsToAdd = Math.max(1, Math.floor(elapsed / speed));
        const newLength = Math.min(displayedLengthRef.current + charsToAdd, text.length);
        
        if (newLength > displayedLengthRef.current) {
          displayedLengthRef.current = newLength;
          setDisplayedText(text.slice(0, newLength));
          lastTimeRef.current = timestamp;
        }
      }

      // Continue if we haven't caught up to the full text
      if (displayedLengthRef.current < text.length) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [text, isStreaming, speed]);

  const isTyping = isStreaming && displayedLengthRef.current < text.length;

  return { displayedText, isTyping };
}

// Individual thinking step with stable typewriter
const ThinkingStep = memo(function ThinkingStep({ 
  log, 
  isLatest, 
  isStreaming 
}: { 
  log: ThinkingLog; 
  isLatest: boolean;
  isStreaming: boolean;
}) {
  const isActive = log.status === 'thinking' || log.status === 'processing';
  const isComplete = log.status === 'success';
  
  // Only animate the latest step while streaming
  const shouldAnimate = isLatest && isStreaming;
  const { displayedText, isTyping } = useStableTypewriter(
    log.reasoning, 
    shouldAnimate,
    12 // Slightly faster for smoother feel
  );
  
  const textToShow = shouldAnimate ? displayedText : log.reasoning;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`
        rounded-xl border p-4 transition-all duration-300
        ${isActive 
          ? 'border-[#ccf437] bg-[#ccf437]/5 shadow-[0_0_0_1px_rgba(204,244,55,0.3)]' 
          : isComplete
          ? 'border-green-200 bg-green-50/30'
          : log.status === 'error'
          ? 'border-red-200 bg-red-50/30'
          : 'border-zinc-200 bg-white'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <StepIcon icon={log.icon} status={log.status} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900 text-sm">
              {log.title}
            </span>
            
            {/* Status badge */}
            {isActive && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#ccf437]/30 text-zinc-700">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 animate-pulse" />
                {log.status === 'thinking' ? 'Analyzing' : 'Processing'}
              </span>
            )}
            {isComplete && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                Done
              </span>
            )}
            {log.status === 'error' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                Failed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reasoning text with stable typewriter */}
      <div className="pl-11">
        <p className="text-sm text-zinc-600 leading-relaxed">
          {textToShow}
          {/* Blinking cursor only when actively typing */}
          {(isTyping || (shouldAnimate && isActive)) && (
            <span 
              className="inline-block w-0.5 h-4 bg-zinc-800 ml-0.5 align-text-bottom"
              style={{ animation: 'blink 0.8s step-end infinite' }}
            />
          )}
        </p>

        {/* Details */}
        {log.details && log.details.length > 0 && isComplete && (
          <div className="mt-3 pt-3 border-t border-zinc-100">
            <div className="flex flex-wrap gap-2">
              {log.details.slice(0, 3).map((detail, idx) => (
                <code
                  key={idx}
                  className="rounded bg-zinc-50 px-2 py-1 text-xs text-zinc-600 border border-zinc-100 font-mono truncate max-w-[200px]"
                >
                  {detail}
                </code>
              ))}
              {log.details.length > 3 && (
                <span className="text-xs text-zinc-400 self-center">
                  +{log.details.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.log.id === nextProps.log.id &&
    prevProps.log.status === nextProps.log.status &&
    prevProps.log.reasoning === nextProps.log.reasoning &&
    prevProps.isLatest === nextProps.isLatest &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});

// Collapsed summary
const CollapsedSummary = memo(function CollapsedSummary({ 
  logs, 
  isStreaming, 
  onExpand 
}: { 
  logs: ThinkingLog[]; 
  isStreaming: boolean; 
  onExpand: () => void;
}) {
  const latestLog = logs[logs.length - 1];
  const completedCount = logs.filter(l => l.status === 'success').length;
  const hasError = logs.some(l => l.status === 'error');

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={onExpand}
      className="
        w-full flex items-center gap-3 p-4
        rounded-xl border border-zinc-200 bg-white shadow-sm
        hover:shadow-md hover:border-zinc-300
        transition-all duration-200
        cursor-pointer text-left
      "
    >
      {/* Status icon */}
      <div className={`
        flex h-8 w-8 items-center justify-center rounded-lg
        ${hasError 
          ? 'bg-red-100 text-red-600' 
          : isStreaming 
          ? 'bg-[#ccf437]/20 text-zinc-700' 
          : 'bg-green-100 text-green-600'
        }
      `}>
        {isStreaming ? (
          <div className="relative">
            <Brain className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#ccf437] animate-pulse" />
          </div>
        ) : hasError ? (
          <span className="font-bold text-sm">!</span>
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900">
          {isStreaming ? (
            <>
              <span>Thinking</span>
              <span className="text-zinc-400 mx-1">·</span>
              <span className="text-zinc-500 truncate">{latestLog?.title}</span>
            </>
          ) : hasError ? (
            'Analysis encountered an issue'
          ) : (
            'Analysis complete'
          )}
        </p>
        
        {/* Progress bar */}
        <div className="mt-2 h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${hasError ? 'bg-red-400' : isStreaming ? 'bg-[#ccf437]' : 'bg-green-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Expand */}
      <ChevronUp className="h-4 w-4 text-zinc-400" />
    </motion.button>
  );
});

// Main component
export function AgentThinkingTrace({ logs, isStreaming }: AgentThinkingTraceProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Throttled auto-scroll to reduce jank
  const lastScrollRef = useRef(0);
  useEffect(() => {
    if (scrollRef.current && isExpanded && isStreaming) {
      const now = Date.now();
      // Only scroll every 200ms
      if (now - lastScrollRef.current > 200) {
        lastScrollRef.current = now;
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ 
            top: scrollRef.current.scrollHeight, 
            behavior: 'smooth' 
          });
        });
      }
    }
  }, [logs, isExpanded, isStreaming]);

  // Auto-collapse
  useEffect(() => {
    if (!isStreaming && logs.length > 0) {
      const timer = setTimeout(() => setIsExpanded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, logs.length]);

  const completedCount = useMemo(() => 
    logs.filter(l => l.status === 'success').length, 
    [logs]
  );

  const handleToggle = useCallback(() => setIsExpanded(e => !e), []);

  if (logs.length === 0) return null;

  return (
    <div className="w-full">
      {/* Blink animation */}
      <style jsx global>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>

      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <CollapsedSummary
            key="collapsed"
            logs={logs}
            isStreaming={isStreaming}
            onExpand={handleToggle}
          />
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-lg
                  ${isStreaming ? 'bg-[#ccf437]/20 text-zinc-700' : 'bg-green-100 text-green-600'}
                `}>
                  {isStreaming ? (
                    <div className="relative">
                      <Brain className="h-4 w-4" />
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#ccf437] animate-pulse" />
                    </div>
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>
                
                <div>
                  <span className="font-semibold text-zinc-900 text-sm">AI Agent Reasoning</span>
                  <span className="ml-2 text-xs text-zinc-400">{completedCount}/4 steps</span>
                </div>
              </div>

              <button
                onClick={handleToggle}
                className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Collapse
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            {/* Steps */}
            <div
              ref={scrollRef}
              className="p-4 space-y-3 max-h-[450px] overflow-y-auto scrollbar-thin"
              style={{ overscrollBehavior: 'contain' }}
            >
              {logs.map((log, index) => (
                <ThinkingStep
                  key={log.id}
                  log={log}
                  isLatest={index === logs.length - 1}
                  isStreaming={isStreaming}
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
