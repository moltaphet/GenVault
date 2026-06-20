# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
GenVault — SmartStakingOptimizer
================================

An Intelligent Staking & Yield Optimizer contract for the GenLayer protocol.

The contract lets accounts stake tokens, tracks each account's principal and
the yield it accrues over time, and re-stakes (compounds) that yield back into
the principal on demand. All time-dependent math is driven by the deterministic
consensus clock that the GenVM exposes through ``datetime.datetime.now()`` (the
block time the leader proposes and every validator agrees on) so all validators
compute identical results — there is no wall-clock read and no reliance on a
client-supplied timestamp.

Design notes
------------
* Money is stored in *atto* scale (value * 10**18) using ``u256``. This is the
  cross-chain convention and keeps every arithmetic operation exact integer
  math — no floats, no rounding drift between validators.
* Yield accrues linearly at a configurable APR/APY expressed in basis points
  (``apy_bps``; 100 bps = 1%). Pending yield for an account is:

      pending = principal * apy_bps * elapsed_seconds
                ----------------------------------------
                   BPS_DENOMINATOR * SECONDS_PER_YEAR

* Compounding folds the pending yield into the principal and resets the
  accrual clock, so future yield is earned on principal + previously
  compounded rewards (true compounding).
* Every state-changing entry point settles pending yield *before* mutating the
  balance, which keeps the accounting invariant simple and exploit-resistant.
"""

import datetime
from dataclasses import dataclass

from genlayer import *


# --------------------------------------------------------------------------- #
# Error classification prefixes (GenLayer standard).                          #
# This contract is fully deterministic, so all business errors are EXPECTED   #
# and must match exactly across validators.                                   #
# --------------------------------------------------------------------------- #
ERROR_EXPECTED = "[EXPECTED]"

# --------------------------------------------------------------------------- #
# Economic constants.                                                         #
# --------------------------------------------------------------------------- #
SECONDS_PER_YEAR: u256 = 31_536_000      # 365 * 24 * 60 * 60
BPS_DENOMINATOR: u256 = 10_000           # 100.00% expressed in basis points
MAX_APY_BPS: u256 = 1_000_000            # safety ceiling: 10,000% APY


@allow_storage
@dataclass
class StakeAccount:
    """Per-account staking position persisted on-chain.

    Fields are append-only: never reorder or insert, only append at the end,
    to preserve storage layout for upgradable deployments.
    """

    principal: u256          # current staked principal in atto scale (includes compounded yield)
    last_accrual_ts: u256    # unix seconds of the last settle/compound for this account
    total_compounded: u256   # lifetime yield folded into principal (statistics)
    total_deposited: u256    # lifetime principal deposited via stake() (statistics)
    total_withdrawn: u256    # lifetime amount withdrawn (statistics)
    exists: bool             # True once the account has ever staked


class SmartStakingOptimizer(gl.Contract):
    # ----- Storage fields (class-level annotations = storage slots) -------- #
    owner: Address
    apy_bps: u256                          # annual yield rate in basis points
    total_staked: u256                     # sum of every account's principal
    staker_count: u256                     # number of accounts that have ever staked
    paused: bool                           # emergency switch for deposits/compounding
    accounts: TreeMap[Address, StakeAccount]

    # --------------------------------------------------------------------- #
    # Lifecycle                                                             #
    # --------------------------------------------------------------------- #
    def __init__(self, initial_apy_bps: int) -> None:
        if initial_apy_bps < 0 or initial_apy_bps > MAX_APY_BPS:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} initial_apy_bps out of range")
        self.owner = gl.message.sender_address
        self.apy_bps = u256(initial_apy_bps)
        self.total_staked = u256(0)
        self.staker_count = u256(0)
        self.paused = False

    # --------------------------------------------------------------------- #
    # Internal helpers                                                      #
    # --------------------------------------------------------------------- #
    def _now_ts(self) -> u256:
        """Deterministic consensus timestamp (unix seconds).

        Inside the GenVM, ``datetime.datetime.now()`` is replaced with the
        block/consensus time proposed by the leader and agreed by every
        validator — it is NOT a wall-clock read, so it is safe to use directly
        in state-changing math. ``time.time()`` and friends are forbidden; this
        is the sanctioned time source.
        """
        return u256(int(datetime.datetime.now(datetime.timezone.utc).timestamp()))

    def _pending_yield(self, acct: StakeAccount, now_ts: u256) -> u256:
        """Linear yield accrued by ``acct`` between its last accrual and now."""
        if acct.principal == 0 or now_ts <= acct.last_accrual_ts:
            return u256(0)
        elapsed = now_ts - acct.last_accrual_ts
        numerator = acct.principal * self.apy_bps * elapsed
        return u256(numerator // (BPS_DENOMINATOR * SECONDS_PER_YEAR))

    def _settle(self, staker: Address, now_ts: u256) -> u256:
        """Fold any pending yield into principal and advance the clock.

        Returns the amount that was compounded. Safe to call on accounts that
        do not exist yet (no-op).
        """
        if staker not in self.accounts:
            return u256(0)
        acct = self.accounts[staker]
        pending = self._pending_yield(acct, now_ts)
        if pending > 0:
            acct.principal = u256(acct.principal + pending)
            acct.total_compounded = u256(acct.total_compounded + pending)
            self.total_staked = u256(self.total_staked + pending)
        acct.last_accrual_ts = now_ts
        return pending

    def _require_owner(self) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} caller is not the owner")

    def _require_active(self) -> None:
        if self.paused:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} contract is paused")

    # --------------------------------------------------------------------- #
    # 1. Staking logic                                                      #
    # --------------------------------------------------------------------- #
    @gl.public.write
    def stake(self, amount: int) -> None:
        """Stake ``amount`` (atto scale) for the caller.

        Any pending yield is compounded first so the new deposit and existing
        principal share a single, clean accrual clock.
        """
        self._require_active()
        if amount <= 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} stake amount must be positive")

        staker = gl.message.sender_address
        now_ts = self._now_ts()

        if staker not in self.accounts:
            self.accounts[staker] = StakeAccount(
                principal=u256(0),
                last_accrual_ts=now_ts,
                total_compounded=u256(0),
                total_deposited=u256(0),
                total_withdrawn=u256(0),
                exists=True,
            )
            self.staker_count = u256(self.staker_count + 1)
        else:
            # Compound everything earned up to now before adding the deposit.
            self._settle(staker, now_ts)

        acct = self.accounts[staker]
        acct.principal = u256(acct.principal + amount)
        acct.total_deposited = u256(acct.total_deposited + amount)
        self.total_staked = u256(self.total_staked + amount)

    # --------------------------------------------------------------------- #
    # 2. Intelligent compounding                                            #
    # --------------------------------------------------------------------- #
    @gl.public.write
    def compound_rewards(self) -> int:
        """Compound the caller's accumulated yield into their principal.

        Returns the amount that was re-staked (atto scale).
        """
        self._require_active()
        staker = gl.message.sender_address
        if staker not in self.accounts:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} no stake found for caller")
        compounded = self._settle(staker, self._now_ts())
        return int(compounded)

    @gl.public.write
    def compound_for(self, staker: str) -> int:
        """Permissionless / keeper-triggered compounding for any account.

        Enables automated compounding bots: anyone can advance an account's
        compounding without being able to move funds. The math is identical and
        deterministic, so it can never disadvantage the account owner.
        Returns the amount that was re-staked (atto scale).
        """
        self._require_active()
        target = Address(staker)
        if target not in self.accounts:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} no stake found for target")
        compounded = self._settle(target, self._now_ts())
        return int(compounded)

    # --------------------------------------------------------------------- #
    # 3. Withdrawal logic                                                   #
    # --------------------------------------------------------------------- #
    @gl.public.write
    def withdraw(self, amount: int) -> int:
        """Withdraw ``amount`` (atto scale) of principal + compounded rewards.

        Pending yield is compounded first, so a withdrawal is always taken
        against the freshest balance. Returns the amount withdrawn.
        """
        if amount <= 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} withdraw amount must be positive")

        staker = gl.message.sender_address
        if staker not in self.accounts:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} no stake found for caller")

        # Settle first so accrued yield is withdrawable.
        self._settle(staker, self._now_ts())

        acct = self.accounts[staker]
        if amount > acct.principal:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} insufficient staked balance")

        acct.principal = u256(acct.principal - amount)
        acct.total_withdrawn = u256(acct.total_withdrawn + amount)
        self.total_staked = u256(self.total_staked - amount)
        return amount

    @gl.public.write
    def withdraw_max(self) -> int:
        """Withdraw the caller's entire balance (principal + compounded yield).

        Returns the total amount withdrawn.
        """
        staker = gl.message.sender_address
        if staker not in self.accounts:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} no stake found for caller")

        self._settle(staker, self._now_ts())
        acct = self.accounts[staker]
        amount = u256(acct.principal)
        if amount == 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} nothing to withdraw")

        acct.principal = u256(0)
        acct.total_withdrawn = u256(acct.total_withdrawn + amount)
        self.total_staked = u256(self.total_staked - amount)
        return int(amount)

    # --------------------------------------------------------------------- #
    # Owner / administration                                                #
    # --------------------------------------------------------------------- #
    @gl.public.write
    def set_apy(self, new_apy_bps: int) -> None:
        """Update the annual yield rate (basis points). Owner only."""
        self._require_owner()
        if new_apy_bps < 0 or new_apy_bps > MAX_APY_BPS:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} new_apy_bps out of range")
        self.apy_bps = u256(new_apy_bps)

    @gl.public.write
    def set_paused(self, value: bool) -> None:
        """Pause or resume deposits and compounding. Owner only.

        Withdrawals stay enabled while paused so funds are never trapped.
        """
        self._require_owner()
        self.paused = value

    @gl.public.write
    def transfer_ownership(self, new_owner: str) -> None:
        """Hand the owner role to ``new_owner``. Owner only."""
        self._require_owner()
        self.owner = Address(new_owner)

    # --------------------------------------------------------------------- #
    # Read-only views                                                       #
    # --------------------------------------------------------------------- #
    @gl.public.view
    def get_apy(self) -> int:
        return int(self.apy_bps)

    @gl.public.view
    def is_paused(self) -> bool:
        return self.paused

    @gl.public.view
    def get_owner(self) -> str:
        return self.owner.as_hex

    @gl.public.view
    def preview_pending(self, staker: str) -> int:
        """Yield that ``staker`` would compound if they acted right now."""
        target = Address(staker)
        if target not in self.accounts:
            return 0
        return int(self._pending_yield(self.accounts[target], self._now_ts()))

    @gl.public.view
    def balance_of(self, staker: str) -> int:
        """Principal of ``staker`` (does NOT include unsettled pending yield)."""
        target = Address(staker)
        if target not in self.accounts:
            return 0
        return int(self.accounts[target].principal)

    @gl.public.view
    def total_balance_of(self, staker: str) -> int:
        """Principal + live pending yield for ``staker`` (withdrawable now)."""
        target = Address(staker)
        if target not in self.accounts:
            return 0
        acct = self.accounts[target]
        return int(acct.principal + self._pending_yield(acct, self._now_ts()))

    @gl.public.view
    def get_account(self, staker: str) -> dict:
        """Full position snapshot for ``staker`` — convenient for the frontend."""
        target = Address(staker)
        if target not in self.accounts:
            return {
                "exists": False,
                "principal": 0,
                "pending_yield": 0,
                "total_balance": 0,
                "last_accrual_ts": 0,
                "total_compounded": 0,
                "total_deposited": 0,
                "total_withdrawn": 0,
            }
        acct = self.accounts[target]
        pending = self._pending_yield(acct, self._now_ts())
        return {
            "exists": True,
            "principal": int(acct.principal),
            "pending_yield": int(pending),
            "total_balance": int(acct.principal + pending),
            "last_accrual_ts": int(acct.last_accrual_ts),
            "total_compounded": int(acct.total_compounded),
            "total_deposited": int(acct.total_deposited),
            "total_withdrawn": int(acct.total_withdrawn),
        }

    @gl.public.view
    def get_stats(self) -> dict:
        """Protocol-wide statistics — convenient for dashboards."""
        return {
            "total_staked": int(self.total_staked),
            "staker_count": int(self.staker_count),
            "apy_bps": int(self.apy_bps),
            "paused": self.paused,
            "owner": self.owner.as_hex,
        }
