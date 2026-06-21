# SkyShield AI - Frontend

Premium Web3 dashboard for the SkyShield AI flight-insurance Intelligent Contract
on GenLayer. Built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, and
**genlayer-js**, in a neon cyberpunk / glassmorphism style.

## Features

- **Global Protocol Stats** - TVL, active policies, lifetime automated payouts.
- **Purchase Policy** - flight code + departure + coverage package, with a live
  premium preview that reproduces the on-chain pricing math.
- **Boarding Pass Monitor** - terminal-style board with flashing live status
  (`ACTIVE`, `CHECKING API`, `RESOLVED - 50% PAYOUT`, ...).
- **Underwriting Vault** - LPs deposit/withdraw GEN and track accrued yield.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # optional: set a deployed contract address
npm run dev                        # http://localhost:3000
```

With no `NEXT_PUBLIC_SKYSHIELD_CONTRACT_ADDRESS`, the dashboard runs in a
self-contained **simulation mode**: the pool, premium pricing, and the
autonomous resolver are all driven client-side so every widget is fully
interactive. Set the address (and `NEXT_PUBLIC_GENLAYER_CHAIN`) to bind reads
and writes to a live deployment.

## Architecture

```
src/
  abi/skyshield-abi.json          # contract ABI (source of truth for calls)
  app/                            # layout, globals.css (theme), page (dashboard)
  components/
    skyshield/                    # the four dashboard widgets + status helper
    ui.tsx, WalletConnect.tsx, Providers.tsx
  context/
    WalletContext.tsx             # injected EIP-1193 wallet
    SkyShieldDataContext.tsx      # data layer + simulation engine
  hooks/useTxAction.ts            # write-tx lifecycle
  lib/
    config.ts, format.ts          # chain config + atto/bps formatting
    genlayer/client.ts            # genlayer-js client factories
    skyshield/                    # config, types, pricing, contract wrappers
```

## Scripts

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
```
