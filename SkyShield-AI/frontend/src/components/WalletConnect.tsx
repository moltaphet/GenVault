"use client";

import { useWallet } from "@/context/WalletContext";
import { shortenAddress } from "@/lib/format";
import { Button } from "./ui";

/** Connect / disconnect control for the injected browser wallet. */
export function WalletConnect() {
  const { address, isConnecting, hasProvider, error, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-3">
        <span className="sky-mono flex items-center gap-2 rounded-xl border border-sky-border bg-sky-panel-2 px-3 py-2 text-sm text-sky-text backdrop-blur-md">
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-sky-cyan"
            style={{ boxShadow: "0 0 8px var(--cyan)" }}
            aria-hidden
          />
          {shortenAddress(address)}
        </span>
        <Button variant="secondary" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button loading={isConnecting} onClick={() => void connect()}>
        {isConnecting ? "Connecting" : "Connect Wallet"}
      </Button>
      {!hasProvider && <span className="text-xs text-sky-muted">No injected wallet detected</span>}
      {error && <span className="max-w-[16rem] text-right text-xs text-sky-red">{error}</span>}
    </div>
  );
}
