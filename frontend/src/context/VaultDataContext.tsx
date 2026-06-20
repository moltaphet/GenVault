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
import { isContractConfigured } from "@/lib/config";
import { getAccountPosition, getProtocolStats } from "@/lib/genlayer/contract";
import { EMPTY_POSITION, type AccountPosition, type ProtocolStats } from "@/lib/genlayer/types";
import { useWallet } from "./WalletContext";

/**
 * Single source of truth for the contract data the UI renders: protocol stats
 * and the connected account's position. Sharing it across panels means a
 * successful stake / compound / withdraw refreshes every view at once, and
 * pending yield ticks live via polling.
 */

interface VaultData {
  stats: ProtocolStats | null;
  position: AccountPosition;
  statsLoading: boolean;
  positionLoading: boolean;
  error: string | null;
  configured: boolean;
  refreshStats: () => Promise<void>;
  refreshPosition: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const VaultDataContext = createContext<VaultData | undefined>(undefined);

const POSITION_POLL_MS = 15_000;

export function VaultDataProvider({ children }: { children: ReactNode }) {
  const { address } = useWallet();
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [position, setPosition] = useState<AccountPosition>(EMPTY_POSITION);
  const [statsLoading, setStatsLoading] = useState(false);
  const [positionLoading, setPositionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    if (!isContractConfigured) return;
    setStatsLoading(true);
    try {
      setStats(await getProtocolStats());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load protocol stats.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const refreshPosition = useCallback(async () => {
    if (!address) {
      setPosition(EMPTY_POSITION);
      return;
    }
    if (!isContractConfigured) return;
    setPositionLoading(true);
    try {
      setPosition(await getAccountPosition(address));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account position.");
    } finally {
      setPositionLoading(false);
    }
  }, [address]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshStats(), refreshPosition()]);
  }, [refreshStats, refreshPosition]);

  // Initial + reactive load of protocol stats.
  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  // Load + poll the connected account's position (keeps pending yield fresh).
  useEffect(() => {
    void refreshPosition();
    if (!address) return;
    const id = setInterval(() => void refreshPosition(), POSITION_POLL_MS);
    return () => clearInterval(id);
  }, [refreshPosition, address]);

  const value = useMemo<VaultData>(
    () => ({
      stats,
      position,
      statsLoading,
      positionLoading,
      error,
      configured: isContractConfigured,
      refreshStats,
      refreshPosition,
      refreshAll,
    }),
    [stats, position, statsLoading, positionLoading, error, refreshStats, refreshPosition, refreshAll],
  );

  return <VaultDataContext.Provider value={value}>{children}</VaultDataContext.Provider>;
}

export function useVaultData(): VaultData {
  const ctx = useContext(VaultDataContext);
  if (!ctx) {
    throw new Error("useVaultData must be used within a <VaultDataProvider>.");
  }
  return ctx;
}
