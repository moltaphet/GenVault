"use client";

import { useCallback, useState } from "react";

/**
 * Drives a single write transaction lifecycle: pending flag, resulting tx
 * hash, and error message. Pass an async function that submits the tx and
 * resolves to its hash.
 */
export function useTxAction() {
  const [pending, setPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<string>, onSuccess?: () => void) => {
      setPending(true);
      setError(null);
      setTxHash(null);
      try {
        const hash = await action();
        setTxHash(hash);
        onSuccess?.();
        return hash;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transaction failed.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setError(null);
    setTxHash(null);
  }, []);

  return { run, pending, txHash, error, reset };
}
