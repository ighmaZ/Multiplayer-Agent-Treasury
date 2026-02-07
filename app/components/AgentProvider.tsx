// components/AgentProvider.tsx
// Context provider for agent state (Circle wallet — no MetaMask needed)

'use client';

import { createContext, useContext, useState, ReactNode, JSX } from 'react';
import { AgentState } from '@/app/lib/agents/state';

interface AgentContextType {
  state: AgentState | null;
  setState: React.Dispatch<React.SetStateAction<AgentState | null>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<AgentState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <AgentContext.Provider
      value={{
        state,
        setState,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent(): AgentContextType {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}
