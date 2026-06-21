# SkyShield AI - Testing Plan

SkyShield AI is an autonomous, oracle-less flight-insurance Intelligent Contract.
Its logic splits cleanly into two layers, and each layer is verified differently:

| Layer | What it is | How it is tested |
|-------|-----------|------------------|
| **Deterministic core** | pool/share accounting, payout tiers, premium math, policy state machine, access control, all input/solvency guards | **Direct-mode tests** (in-memory, ~0.4s) |
| **Non-deterministic edge** | AI risk pricing (`purchase_policy`), live flight fetch + LLM parse (`check_flight_and_execute`) | **Integration tests** (real validators, web + LLM) |

The contract is deliberately structured so the money-moving logic lives in
deterministic helpers (`_mint_policy`, `_apply_resolution`) that *both* the
non-deterministic public methods and the owner fallback entry points call. This
lets direct mode exercise the full economic lifecycle without a live network,
while the non-deterministic wrappers are validated separately under consensus.

---

## 0. Setup

All commands below run from this directory (the `SkyShield-AI/` root) and use a
Python 3.12 virtual environment. The shared toolchain venv lives one level up at
`../.venv` (it has `gltest` and `genvm-linter` installed). To create a dedicated
local one instead:

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
# then replace ../.venv with .venv in the commands below.
```

Layout:

```
SkyShield-AI/
  contracts/sky_shield_ai.py        # the Intelligent Contract
  tests/direct/test_sky_shield_ai.py # direct-mode test suite (26 tests)
  tools/lint_pinned.py              # genvm-lint validate with SDK pinned to v0.2.16
  requirements.txt
  TESTING.md
```

---

## 1. Lint (run first, always)

```bash
# AST safety (fast, no SDK needed)
../.venv/bin/genvm-lint lint contracts/sky_shield_ai.py

# Full SDK semantic validation. The linter resolves "latest" to a 404 prerelease,
# so pin the cached v0.2.16 build:
../.venv/bin/genvm-lint download --version v0.2.16
../.venv/bin/python tools/lint_pinned.py   # monkeypatches get_latest_version -> v0.2.16
```

Expected: `Lint passed (3 checks)` and `Validation passed - Contract: SkyShieldAI,
Methods: 16 (7 view, 9 write)`.

---

## 2. Direct-mode tests (implemented)

```bash
../.venv/bin/python -m pytest tests/direct/test_sky_shield_ai.py -v
```

26 tests, all passing. Coverage:

**Payout tiers & pricing** (`quote_payout`, `preview_premium` views)
- 0% / 20% / 50% / 100% boundaries at 59/60/119/120/239/240 minutes
- CANCELLED -> 100% regardless of delay
- Premium = fair expected-loss + 30% loading, floored at the minimum, risk clamped at 100%

**Liquidity pool & shares**
- First LP bootstraps 1:1; later LPs minted strictly pro-rata
- `withdraw_liquidity` burns shares and credits the pull-payment ledger
- `claim` pays out and zeroes the ledger; claiming nothing reverts
- Over-withdraw of shares reverts

**Policy lifecycle** (via owner fallback = deterministic core)
- Purchase escrows the premium into the pool and reserves `max_payout`
- On-time flight -> `EXPIRED`, premium becomes LP yield, share price rises
- Delayed flight -> `RESOLVED`, granular payout credited to the passenger
- Cancelled -> full payout
- Duplicate ACTIVE policy for the same flight is rejected; the slot frees on resolution
- Double-resolution is blocked (no policy is ever paid twice)

**Solvency & safety**
- Underwriting is blocked when the pool cannot back the coverage
- LPs cannot withdraw reserved (locked) coverage; small in-band redemptions still work
- `check_flight_and_execute` guards (unknown / not-departed / inactive) revert *before* any web call
- Owner-only administration; pause blocks deposits but never traps LP exits
- Ownership transfer flips administrative authority

---

## 3. Integration tests (implemented)

Implemented under `tests/integration/` and driven by `gltest.config.yaml`
(default network `studionet`, which is gasless):

```bash
gltest tests/integration/test_live_deployment.py -v -s --network studionet  # live reads vs 0x6307...b718
gltest tests/integration/test_consensus_flows.py -v -s --network studionet  # deterministic flows, full consensus
gltest tests/integration/ -v -s -m slow --network studionet                 # real AI/web (purchase + resolve)
```

- `test_live_deployment.py` attaches to the deployed address
  `0x6307D2f373d912508316A14612ec99992c56b718` for read-only state + pricing-view
  checks, and skips gracefully if the contract is not reachable on the network.
- `test_consensus_flows.py` deploys a fresh instance and validates liquidity,
  the full policy lifecycle, every payout tier, duplicate rejection, and the
  solvency guard under leader + validator consensus.
- `test_nondeterministic.py` (marked `slow`) exercises the AI-priced
  `purchase_policy` and the live `check_flight_and_execute` resolver.

The plan each integration file follows is detailed below.

These require a running GenLayer environment (localnet/studionet) with validators,
web access, and an LLM. They assert on consensus behaviour, not just return values.

### 3.1 `purchase_policy` - AI risk pricing
- **Happy path:** fund the pool, call `purchase_policy("BA245", <future ts>)` from a
  passenger. Assert a policy is created `ACTIVE`, the premium lands in a sane band
  (`MIN_PREMIUM <= premium <= max_payout`), and `risk_bps` is within `[0, 10000]`.
- **Consensus tolerance:** run with multiple validators. The validator approves the
  leader when the risk lands in the same `risk_band` and the premium is within
  +/-25%. Confirm the tx finalizes (validators agree) rather than looping.
- **Determinism of the committed value:** the *leader's* premium is what gets stored;
  re-reading `get_policy` returns a stable figure.

### 3.2 `check_flight_and_execute` - live fetch + LLM parse
Point `AVIATION_API_BASE` at a real (keyed) endpoint or a controlled mock that returns
known statuses, then:
- **On-time flight:** status `LANDED`/`ACTIVE`, 0 delay -> policy `EXPIRED`, 0 payout,
  premium retained as LP yield.
- **Each delay tier:** mock responses at 75 / 150 / 300 minutes -> 20% / 50% / 100%
  payouts credited to the passenger's claimable balance.
- **Cancelled:** status `CANCELLED` -> 100% payout.
- **Consensus gate:** validators must agree on the derived **payout tier** only; verify
  that small per-validator differences in reported delay minutes within the same tier
  still finalize.
- **Error classification:**
  - API 4xx -> `[EXTERNAL]` (deterministic, validators match exactly)
  - API 5xx / network -> `[TRANSIENT]` (validators agree if both transient)
  - malformed LLM output -> `[LLM_ERROR]` (validators disagree -> rotation)
- **Autonomous trigger:** confirm the method is permissionless (any sender) and that it
  reverts before any network call when the flight has not yet departed.

### 3.3 End-to-end economic invariant
After a batch of mixed outcomes, assert the conservation identity:

```
total_assets == sum(LP deposits) + total_premiums_collected
               - total_payouts - (LP redemptions moved to claimable)
locked_coverage == sum(max_payout of ACTIVE policies)
total_assets   >= locked_coverage      # solvency, must always hold
```

---

## 4. Quick commands

```bash
# from the SkyShield-AI/ root, using the Python 3.12 venv
../.venv/bin/python -m pytest tests/direct/ -q                      # all direct tests
../.venv/bin/python -m pytest tests/direct/test_sky_shield_ai.py -v # SkyShield only
../.venv/bin/genvm-lint lint contracts/sky_shield_ai.py            # AST safety
```
