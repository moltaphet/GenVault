<div align="center">

# SkyShield AI

### Autonomous Algorithmic Flight & Travel Insurance Protocol

**Oracle-less. Keeper-less. AI-underwritten parametric flight-delay insurance on GenLayer.**

`Deployed: 0x6307D2f373d912508316A14612ec99992c56b718`

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Why It Is Different](#why-it-is-different)
3. [System Architecture](#system-architecture)
4. [Intelligent Contract Capabilities](#intelligent-contract-capabilities)
5. [Repository Structure](#repository-structure)
6. [Quick Start](#quick-start)
7. [Deployment & Testing Guide](#deployment--testing-guide)
8. [Frontend Application](#frontend-application)
9. [Security Model](#security-model)
10. [Technology Stack](#technology-stack)

---

## Overview

SkyShield AI is a parametric travel-insurance protocol implemented as a single GenLayer
**Intelligent Contract**. A passenger insures a flight; if that flight is delayed or cancelled, the
contract pays out automatically - with no claims process, no oracle feed, and no off-chain keeper.

It achieves this by using the two native superpowers of the GenLayer Virtual Machine (GenVM)
*inside consensus*:

- **Native internet connectivity** - the contract reads live flight status straight from an aviation
  API during execution.
- **LLM reasoning** - the contract uses an AI model to price premiums from delay risk and to parse
  messy, free-form flight-status text into a deterministic payout decision.

Capital is supplied by a community **underwriting pool**. Liquidity Providers (LPs) deposit GEN to
back policies and earn the premiums of flights that depart on time.

---

## Why It Is Different

| Traditional parametric insurance | SkyShield AI |
|----------------------------------|--------------|
| Off-chain oracle pushes flight data | Contract fetches live data itself, in consensus |
| Keeper bot triggers settlement | Permissionless, self-triggering resolution |
| Fixed actuarial premium tables | AI risk model prices each policy dynamically |
| Binary (delayed / not delayed) payout | Multi-stage granular payout (20% / 50% / 100%) |
| Trust in a single data provider | Every validator re-fetches and must agree on the tier |

---

## System Architecture

```
                          PASSENGER                         LIQUIDITY PROVIDER
                              |                                     |
                  purchase_policy(flight, ts)          provide_liquidity / withdraw
                              |                                     |
        +---------------------v-------------------------------------v---------------------+
        |                    SkyShield AI Intelligent Contract (GenVM)                    |
        |                                                                                 |
        |   AI Underwriting          Share-based Pool            Autonomous Resolver      |
        |   - exec_prompt risk  -->  - total_assets / shares --> - web.get(aviation API)  |
        |   - quote_premium          - locked_coverage           - exec_prompt parse      |
        |                            - solvency invariant        - multi-stage payout     |
        +------------------------------------+--------------------------------------------+
                                             |
                  consensus on the DERIVED payout tier (not the raw bytes)
                                             |
                        Leader proposes  ->  Validators re-run  ->  Agree / rotate
```

The frontend is a separate **Next.js 16** application that reads protocol state through `genlayer-js`
and submits transactions through an injected wallet. When no contract address is configured it runs a
faithful client-side **simulation** so every component is fully interactive.

---

## Intelligent Contract Capabilities

### 1. Dynamic AI Premium Pricing (`purchase_policy`)
A quick internal AI risk model estimates the probability the flight is delayed >= 1h or cancelled and
prices the premium as fair-odds expected loss plus a protocol loading margin:

```
premium = coverage * risk_bps / 10000 * (1 + loading_bps / 10000)
```

Validators independently re-run the model and approve the leader's quote when the risk lands in the
same band and the premium is within a +/-25% tolerance - the noisy raw score is never compared
directly.

### 2. Oracle-less AI Web-Scraping Resolution (`check_flight_and_execute`)
A permissionless, self-triggering hook fetches live flight status over HTTP, uses the LLM to normalize
it into `(delay_minutes, cancelled)`, and settles the policy. The **payout tier** is the only
consensus-critical value, so small per-validator differences in the raw payload cannot break
consensus.

### 3. Multi-Stage Granular Payouts

| Flight outcome | Payout | Policy status |
|----------------|--------|---------------|
| On time (< 1h delay) | 0% | `EXPIRED` (premium becomes LP yield) |
| 1h - 2h delay | 20% | `RESOLVED` |
| 2h - 4h delay | 50% | `RESOLVED` |
| > 4h delay or `CANCELLED` | 100% | `RESOLVED` |

### 4. Share-Based Underwriting Pool (`provide_liquidity` / `withdraw_liquidity`)
LPs mint pool shares pro-rata to current value, earn retained premiums, and can only redeem against
*un-reserved* liquidity - active policy coverage can never be pulled out from under passengers.

### 5. Pull-Payment Settlement (`claim`)
Payouts and LP redemptions accrue to a `claimable` ledger and are withdrawn through a single
re-entrancy-guarded chokepoint that follows checks-effects-interactions ordering.

### 6. Owner Fallbacks (`admin_open_policy` / `admin_resolve_policy`)
Deterministic, owner-only entry points used for emergency operation if the AI/aviation endpoints are
unavailable - and as the deterministic seam that lets the full economic lifecycle be unit-tested in
direct mode.

---

## Repository Structure

```
SkyShield-AI/
|-- contracts/
|     sky_shield_ai.py            # the Intelligent Contract (pure Python)
|-- tests/
|     direct/                     # in-memory unit tests (26 tests, ~0.4s)
|       test_sky_shield_ai.py
|     integration/                # live + consensus tests against a real network
|       test_live_deployment.py   # live reads vs the deployed address
|       test_consensus_flows.py   # deterministic flows under full consensus
|       test_nondeterministic.py  # real AI/web (marked slow)
|-- tools/
|     lint_pinned.py              # genvm-lint validate, SDK pinned to v0.2.16
|-- frontend/                     # Next.js 16 + Tailwind v4 + genlayer-js dashboard
|     src/...
|-- gltest.config.yaml            # integration network configuration
|-- pytest.ini                    # marker registration (slow)
|-- requirements.txt              # Python toolchain
|-- TESTING.md                    # detailed testing plan
'-- README.md
```

---

## Quick Start

```bash
# 1. Python toolchain (Python 3.10-3.12 required)
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt

# 2. Validate and test the contract
.venv/bin/genvm-lint lint contracts/sky_shield_ai.py
.venv/bin/python -m pytest tests/direct/ -q

# 3. Run the frontend
cd frontend && npm install && npm run dev   # http://localhost:3000
```

---

## Deployment & Testing Guide

### Step 1 - Lint and validate the contract

```bash
# AST safety (fast, no SDK download)
.venv/bin/genvm-lint lint contracts/sky_shield_ai.py

# Full SDK semantic validation (SDK pinned to the cached v0.2.16)
.venv/bin/genvm-lint download --version v0.2.16
.venv/bin/python tools/lint_pinned.py
# Expected: Validation passed - Contract: SkyShieldAI, Methods: 16 (7 view, 9 write)
```

### Step 2 - Direct-mode unit tests (in-memory, no network)

```bash
.venv/bin/python -m pytest tests/direct/ -q          # 26 passed
```

Covers payout tiers, premium math, the share-based pool, the full policy lifecycle, solvency, and
every access-control / re-entrancy guard.

### Step 3 - Integration tests (real GenLayer environment)

Configured in `gltest.config.yaml`. The default target is `studionet` (gasless - a 0 GEN account is
fine).

```bash
# Live-state reads against the DEPLOYED contract (0x6307...b718)
gltest tests/integration/test_live_deployment.py -v -s --network studionet

# Deterministic economic flows under full leader + validator consensus
gltest tests/integration/test_consensus_flows.py -v -s --network studionet

# Non-deterministic AI/web paths (real LLM + aviation API)
gltest tests/integration/ -v -s -m slow --network studionet
```

Live-read tests **skip** gracefully when the address is not reachable on the selected network, so the
suite never hard-fails offline.

### Step 4 - Deploy

Deploy with the GenLayer CLI or Studio, then publish the resulting address to the frontend:

```bash
# frontend/.env.local
NEXT_PUBLIC_SKYSHIELD_CONTRACT_ADDRESS=0x6307D2f373d912508316A14612ec99992c56b718
NEXT_PUBLIC_GENLAYER_CHAIN=studionet
```

### Step 5 - Run the frontend

```bash
cd frontend
npm install
npm run build      # production build (all routes prerender)
npm run dev        # or develop at http://localhost:3000
```

---

## Frontend Application

A responsive, neon **cyberpunk / glassmorphism** dashboard built with Next.js 16 (App Router),
Tailwind CSS v4, and genlayer-js. Navigation is shared across four routes.

### `/` - Operations Dashboard
| Component | Purpose |
|-----------|---------|
| **Protocol Stats Header** | Total Value Locked, Active Policies, Automated Payouts |
| **Purchase Policy** | Flight code + departure + coverage package, with a live AI premium preview |
| **Boarding Pass Monitor** | Terminal-style board with flashing live status (`ACTIVE`, `CHECKING API`, `RESOLVED - 50% PAYOUT`, ...) |
| **Underwriting Vault** | LP deposit / withdraw, share value, accrued yield, and claim |

### `/portfolio` - User Portfolio & Assets
Per-account tracking: aggregate premium spent, total claims recovered, net underwriting result,
active coverage count, and the user's LP position (shares, redeemable value, pool share, accrued
yield) plus a list of their active policies.

### `/history` - Historical Ledger
Every past resolution: claims paid (delayed / cancelled flights) and expired policies (on-time
flights), each with its granular payout tier and settlement time, plus headline totals.

### `/docs` - Documentation & Info
Protocol logic, the AI web-scraping resolution model, the multi-stage payout table, validation
parameters, and the safety / error classification model.

> Without `NEXT_PUBLIC_SKYSHIELD_CONTRACT_ADDRESS`, every screen runs in a faithful client-side
> **simulation** (seeded pool, AI-priced premiums, and an autonomous resolver that drives the live
> board) so the full experience is interactive with zero setup.

---

## Security Model

**Error classification** drives validator agreement on failure paths:

| Prefix | Meaning | Validator behaviour |
|--------|---------|---------------------|
| `[EXPECTED]` | Deterministic business logic | Must match the message exactly |
| `[EXTERNAL]` | External API 4xx | Must match exactly |
| `[TRANSIENT]` | Network / 5xx | Agree if both transient |
| `[LLM_ERROR]` | Model misbehaviour | Disagree on purpose to force rotation |

**Invariants and guards**

- **Solvency:** `total_assets >= locked_coverage` is preserved on every state transition.
- **Coverage reservation:** the full `max_payout` is locked while a policy is `ACTIVE`.
- **Re-entrancy:** a guard plus checks-effects-interactions ordering on every value-out path.
- **Duplicate protection:** one `ACTIVE` policy per passenger + flight + departure.
- **Double-resolution:** a settled policy can never be paid twice.
- **Money safety:** all values are atto-scale `u256` integer math - no floats, no rounding drift
  between validators.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Intelligent Contract | Python, GenLayer SDK (GenVM runner `py-genlayer`) |
| Contract tooling | `genvm-linter`, `genlayer-test` (gltest), pytest |
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 (neon cyberpunk / glassmorphism theme) |
| Web3 | genlayer-js, injected EIP-1193 wallet |

---

<div align="center">

**SkyShield AI** - no oracles, no keepers. Built on GenLayer.

</div>
