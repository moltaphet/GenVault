# GenVault Frontend

Next.js (App Router) + TypeScript + Tailwind CSS v4 frontend for the
**GenVault** Intelligent Staking & Yield Optimizer. It connects to the
`SmartStakingOptimizer` Intelligent Contract on GenLayer through
[`genlayer-js`](https://www.npmjs.com/package/genlayer-js), using the ABI
generated from the contract (`src/abi/abi.json`).

## Getting started

```bash
cd frontend
npm install

# Configure the contract + network
cp .env.local.example .env.local
# then edit .env.local:
#   NEXT_PUBLIC_CONTRACT_ADDRESS=0x...        (deployed SmartStakingOptimizer)
#   NEXT_PUBLIC_GENLAYER_CHAIN=studionet      (studionet | localnet | testnetAsimov | testnetBradbury)

npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run typecheck`.

## Folder layout

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + providers
│   │   ├── page.tsx            # Dashboard composition
│   │   └── globals.css         # Tailwind v4 + theme tokens
│   ├── components/
│   │   ├── Providers.tsx       # Client provider tree (wallet)
│   │   ├── WalletConnect.tsx   # Connect / disconnect control
│   │   ├── ProtocolStats.tsx   # TVL, stakers, APY, status
│   │   ├── AccountOverview.tsx # Connected account position (polls yield)
│   │   ├── StakePanel.tsx      # stake()
│   │   ├── CompoundPanel.tsx   # compound_rewards()
│   │   ├── WithdrawPanel.tsx   # withdraw() / withdraw_max()
│   │   └── ui.tsx              # Card, Stat, Button, AmountInput, Banner
│   ├── context/
│   │   └── WalletContext.tsx   # Injected-wallet (EIP-1193) connection
│   ├── hooks/
│   │   ├── useProtocolStats.ts
│   │   ├── useAccountPosition.ts
│   │   └── useTxAction.ts      # Write-tx lifecycle (pending/hash/error)
│   ├── lib/
│   │   ├── config.ts           # Env-driven chain + contract config
│   │   ├── format.ts           # atto <-> token, bps <-> %, address shortening
│   │   └── genlayer/
│   │       ├── client.ts       # createClient factories (read / wallet / dev)
│   │       ├── contract.ts     # Typed read/write wrappers + ABI re-export
│   │       └── types.ts        # AccountPosition, ProtocolStats
│   └── abi/
│       └── abi.json            # Generated from the contract (genvm-lint schema)
├── .env.local.example
├── next.config.mjs
├── postcss.config.mjs
├── tailwind: Tailwind v4 (configured via globals.css + postcss)
└── tsconfig.json
```

## Contract integration

- **Reads** (no wallet): `getProtocolStats`, `getAccountPosition`, `previewPending`,
  `getApyBps`, `isPaused` in `src/lib/genlayer/contract.ts` — all via
  `client.readContract({ address, functionName, args })`.
- **Writes** (wallet-connected): `stake`, `compoundRewards`, `compoundFor`,
  `withdraw`, `withdrawMax` — via `client.writeContract(...)` followed by
  `client.waitForTransactionReceipt({ hash, status })`.
- **Units:** all money is atto-scale `bigint` (`value * 10 ** 18`). Convert with
  `tokenToAtto` / `attoToToken`. APY is basis points — render with `bpsToPercent`.

## Notes / next steps

- The wallet layer (`WalletContext.tsx` + `client.ts`) is a placeholder against
  an injected EIP-1193 provider (MetaMask-style). Swap in your preferred wallet
  connector there; the rest of the app is decoupled from it.
- When the contract's tokenization is finalized (native payable vs. ERC-20-style
  token), wire approvals/allowances into `StakePanel` and adjust `value` in the
  `stake` write call accordingly.
- Keep `src/abi/abi.json` in sync with the contract:
  `genvm-lint schema ../contracts/smart_staking_optimizer.py --output src/abi/abi.json`.
