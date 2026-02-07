// components/AgentProvider.tsx
// Context provider for agent state

'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { AgentState } from '@/app/lib/agents/state';
import { sepoliaMetaMaskConfig } from '@/app/lib/services/paymentPlanner';

interface AgentContextType {
  state: AgentState | null;
  setState: React.Dispatch<React.SetStateAction<AgentState | null>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  walletAddress: string | null;
  isWalletConnecting: boolean;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
  ensureWalletNetwork: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<AgentState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  const ensureWalletNetwork = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is required');
    }

    const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
    if (chainId === sepoliaMetaMaskConfig.chainId) {
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: sepoliaMetaMaskConfig.chainId }],
      });
    } catch {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [sepoliaMetaMaskConfig],
      });
    }
  }, []);

  const connectWallet = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      toast.error('MetaMask is required to continue');
      return null;
    }

    setIsWalletConnecting(true);
    try {
      await ensureWalletNetwork();
      const existingAccounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
      if (Array.isArray(existingAccounts) && existingAccounts.length > 0) {
        setWalletAddress(existingAccounts[0]);
        return existingAccounts[0];
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const address = Array.isArray(accounts) ? accounts[0] : null;
      setWalletAddress(address);
      return address;
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect wallet');
      return null;
    } finally {
      setIsWalletConnecting(false);
    }
  }, [ensureWalletNetwork]);

  const disconnectWallet = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setWalletAddress(null);
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      console.warn('⚠️ Unable to revoke wallet permissions:', error);
    } finally {
      setWalletAddress(null);
    }
  }, []);

  return (
    <AgentContext.Provider
      value={{
        state,
        setState,
        isLoading,
        setIsLoading,
        walletAddress,
        isWalletConnecting,
        connectWallet,
        disconnectWallet,
        ensureWalletNetwork,
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
