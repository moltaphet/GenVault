# GenVault — Contract Architecture

This document describes the `SmartStakingOptimizer` Intelligent Contract and the
ABI the frontend binds to. Pair it with the machine-readable
[`abi.json`](abi.json).

## 1. Overview

`SmartStakingOptimizer` is a single-file GenLayer Intelligent Contract
(`contracts/smart_staking_optimizer.py`). It is **fully deterministic**: it makes
no LLM or web calls, so it does not need a custom equivalence principle — every
validator re-executes the same integer math against the same consensus block
time and reaches identical state.

### Why it is "intelligent"

The contract embodies the GenLayer execution model rather than LLM inference:

- It reads the **consensus block clock** (`datetime.datetime.now()`, which the
  GenVM replaces with the leader-proposed, validator-agreed block time) to
  compute time-weighted yield deterministically — something an EVM contract can
  only approximate with miner-influenced `block.timestamp`.
- Compounding can be **triggered permissionlessly** (`compound_for`), enabling
  off-chain keeper/automation agents to optimize positions without custody.

## 2. State model

### Contract storage (`gl.Contract` fields)

| Field | Type | Meaning |
|-------|------|---------|
| `owner` | `Address` | Admin (set APY, pause, transfer ownership) |
| `apy_bps` | `u256` | Annual yield rate in basis points (100 = 1%) |
| `total_staked` | `u256` | Sum of every account's principal (atto) |
| `staker_count` | `u256` | Number of accounts that have ever staked |
| `paused` | `bool` | Emergency switch for deposits/compounding |
| `accounts` | `TreeMap[Address, StakeAccount]` | Per-account positions |

### Per-account record (`StakeAccount`)

| Field | Type | Meaning |
|-------|------|---------|
| `principal` | `u256` | Current staked principal incl. compounded yield (atto) |
| `last_accrual_ts` | `u256` | Unix seconds of last settle/compound |
| `total_compounded` | `u256` | Lifetime yield folded into principal |
| `total_deposited` | `u256` | Lifetime principal deposited via `stake()` |
| `total_withdrawn` | `u256` | Lifetime amount withdrawn |
| `exists` | `bool` | True once the account has ever staked |

> **Upgrade note:** `StakeAccount` fields are append-only. Never reorder or
> insert — storage layout is positional. Add new fields at the end only.

## 3. Yield math

Linear accrual between settlements, exact integer arithmetic:

```
pending = principal * apy_bps * elapsed_seconds
          ----------------------------------------
             BPS_DENOMINATOR * SECONDS_PER_YEAR

BPS_DENOMINATOR = 10_000
SECONDS_PER_YEAR = 31_536_000   (365 days)
```

`_settle()` folds `pending` into `principal`, adds it to `total_compounded` and
`total_staked`, and advances `last_accrual_ts` to now. Because subsequent yield
is then computed on the larger principal, periodic compounding is geometric:

- Stake 100 tokens @ 10% APY → after 1 year, principal = 110.
- Compound, wait another year → yield is 11 (10% of 110), principal = 121.

**Invariant:** every state-changing entry point settles pending yield *before*
mutating the balance, so a withdrawal is always taken against the freshest value
and accounting stays consistent.

## 4. Public ABI

Money arguments/returns are **atto-scale** (`value * 10**18`). Addresses are
0x-prefixed hex strings. `apy_bps` is basis points.

### Constructor

| Param | Type | Notes |
|-------|------|-------|
| `initial_apy_bps` | `int` | 0 … 1_000_000 (≤ 10,000% APY). Deployer becomes `owner`. |

### Write methods

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `stake` | `amount: int` | — | Stake `amount`; compounds any pending yield first. Reverts if paused or `amount <= 0`. |
| `compound_rewards` | — | `int` | Compound the caller's pending yield into principal; returns amount compounded. |
| `compound_for` | `staker: str` | `int` | Permissionless/keeper compounding for `staker`; returns amount compounded. |
| `withdraw` | `amount: int` | `int` | Settle, then withdraw `amount` of principal+rewards; returns amount withdrawn. Reverts if `amount` exceeds balance. |
| `withdraw_max` | — | `int` | Settle, then withdraw the caller's entire balance; returns total. |
| `set_apy` | `new_apy_bps: int` | — | Owner only. |
| `set_paused` | `value: bool` | — | Owner only. Withdrawals stay enabled while paused. |
| `transfer_ownership` | `new_owner: str` | — | Owner only. |

### View methods (gas-free reads)

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `get_apy` | — | `int` | Current APY in bps. |
| `is_paused` | — | `bool` | Pause state. |
| `get_owner` | — | `str` | Owner address. |
| `balance_of` | `staker: str` | `int` | Settled principal (excludes unsettled pending). |
| `total_balance_of` | `staker: str` | `int` | Principal + live pending yield (withdrawable now). |
| `preview_pending` | `staker: str` | `int` | Yield `staker` would compound right now. |
| `get_account` | `staker: str` | `dict` | Full position snapshot (see below). |
| `get_stats` | — | `dict` | Protocol totals. |

`get_account(staker)` returns:

```json
{
  "exists": true,
  "principal": 110000000000000000000,
  "pending_yield": 0,
  "total_balance": 110000000000000000000,
  "last_accrual_ts": 1767225600,
  "total_compounded": 10000000000000000000,
  "total_deposited": 100000000000000000000,
  "total_withdrawn": 0
}
```

`get_stats()` returns `{ total_staked, staker_count, apy_bps, paused, owner }`.

## 5. Errors

All business errors are deterministic and prefixed `[EXPECTED]` (GenLayer error
classification). Validators must match them exactly. Examples:

- `[EXPECTED] stake amount must be positive`
- `[EXPECTED] insufficient staked balance`
- `[EXPECTED] no stake found for caller`
- `[EXPECTED] caller is not the owner`
- `[EXPECTED] contract is paused`

## 6. Frontend integration (next milestone)

The UI will use `genlayer-js`:

1. **Read** balances/yield with the view methods (no transaction, instant):
   `total_balance_of`, `preview_pending`, `get_account`, `get_stats`.
2. **Write** via `stake`, `compound_rewards`, `withdraw`, `withdraw_max` —
   submit a transaction and wait for acceptance/finality.
3. **Display scaling:** divide atto values by `10**18` for human units; render
   `apy_bps / 100` as a percentage.
4. **Automation:** an optional keeper loop can call `compound_for(address)` for
   opted-in users to keep positions optimally compounded.

## 7. Tokenization note

This version manages staked balances as an internal `u256` ledger keyed by
account (amounts passed explicitly). Wiring it to value transfer is a deliberate,
isolated next step — either:

- a **payable** native-token model (`@gl.public.write.payable` + `gl.message.value`
  on `stake`, and a native transfer-out on withdrawal), or
- an **ERC-20-style token contract** integrated via GenLayer cross-contract calls.

The accounting, yield, and compounding logic above are unaffected by that choice.
