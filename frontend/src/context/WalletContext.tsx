"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createConnectedClient, type GenLayerClient } from "@/lib/genlayer/client";

/**
 * Web3 wallet connector for an injected EIP-1193 provider (MetaMask and
 * compatible wallets).
 *
 * Responsibilities:
 * - Request account access on demand and expose the active address.
 * - Silently restore an already-authorized session on page load.
 * - React to the user switching accounts or networks in the wallet.
 * - Expose a genlayer-js client bound to the connected wallet for writes.
 */

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
  isMetaMask?: boolean;
}

interface WalletState {
  /** Active checksummed address, or null when disconnected. */
  address: `0x${string}` | null;
  /** Wallet chain id (hex string, e.g. "0xaa36a7"), or null. */
  chainId: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  /** True once we have confirmed an injected provider exists. */
  hasProvider: boolean;
  error: string | null;
  /** genlayer-js client bound to the connected wallet (writes), or null. */
  client: GenLayerClient | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

/** EIP-1193 "user rejected request" error code. */
const USER_REJECTED = 4001;

function getInjectedProvider(): Eip1193Provider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
}

function normalizeError(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    if ((err as { code: number }).code === USER_REJECTED) {
      return "Connection request was rejected in your wallet.";
    }
  }
  return err instanceof Error ? err.message : "Failed to connect wallet.";
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasProvider, setHasProvider] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect provider + restore an already-authorized session on mount.
  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider) return;
    setHasProvider(true);

    let cancelled = false;
    void (async () => {
      try {
        const accounts = (await provider.request({
          method: "eth_accounts",
        })) as string[];
        if (!cancelled && accounts?.[0]) {
          setAddress(accounts[0] as `0x${string}`);
        }
        const id = (await provider.request({ method: "eth_chainId" })) as string;
        if (!cancelled) setChainId(id ?? null);
      } catch {
        // No authorized account yet — stay disconnected silently.
      }
    })();

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = (args[0] as string[]) ?? [];
      setAddress(accounts[0] ? (accounts[0] as `0x${string}`) : null);
    };
    const handleChainChanged = (...args: unknown[]) => {
      setChainId((args[0] as string) ?? null);
    };

    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);

    return () => {
      cancelled = true;
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const provider = getInjectedProvider();
    if (!provider) {
      setError("No injected wallet found. Install MetaMask or a compatible wallet.");
      return;
    }
    try {
      setIsConnecting(true);
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const next = accounts?.[0];
      if (!next) {
        setError("No account was authorized.");
        return;
      }
      setAddress(next as `0x${string}`);
      const id = (await provider.request({ method: "eth_chainId" })) as string;
      setChainId(id ?? null);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  // Wallet-bound client for write transactions. Recreated when the active
  // address or network changes so the signer always matches the UI.
  const client = useMemo<GenLayerClient | null>(() => {
    if (!address) return null;
    const provider = getInjectedProvider();
    if (!provider) return null;
    return createConnectedClient(address, provider);
  }, [address, chainId]);

  const value = useMemo<WalletState>(
    () => ({
      address,
      chainId,
      isConnecting,
      isConnected: address !== null,
      hasProvider,
      error,
      client,
      connect,
      disconnect,
    }),
    [address, chainId, isConnecting, hasProvider, error, client, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a <WalletProvider>.");
  }
  return ctx;
}
