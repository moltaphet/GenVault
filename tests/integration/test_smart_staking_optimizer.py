"""Integration tests for the GenVault SmartStakingOptimizer contract.

Unlike the direct-mode suite (tests/direct/), these run against a real GenLayer
network with full leader + validator consensus. Write methods return tx
receipts (assert with tx_execution_succeeded); read methods use .call().

There is NO mocking here: stake() runs the real LLM risk screen and
update_apy_from_market() performs a live DeFiLlama fetch — both settled through
consensus. Default target is studionet (gasless, built-in LLM); override with
--network as needed.

Run:  gltest tests/integration/ -v -s
      gltest tests/integration/ -v -s -m slow   # include the live web fetch
"""

import pytest

from gltest import get_contract_factory, get_default_account, get_accounts
from gltest.assertions import tx_execution_succeeded, tx_execution_failed

TOKEN = 10**18          # 1 token in atto scale
APY_BPS = 1000          # 10.00% annual — a "sane" APY for the risk screen
MAX_APY_BPS = 1_000_000  # contract safety ceiling (10,000% APY); see contract constants


def _deploy(apy_bps: int = APY_BPS):
    """Deploy a fresh optimizer owned by the default (deployer) account."""
    factory = get_contract_factory("SmartStakingOptimizer")
    return factory.deploy(args=[apy_bps])


# --------------------------------------------------------------------------- #
# Deployment & initial state                                                  #
# --------------------------------------------------------------------------- #
def test_deploy_and_initial_state():
    owner = get_default_account()
    contract = _deploy()

    assert contract.get_apy(args=[]).call() == APY_BPS
    assert contract.is_paused(args=[]).call() is False
    assert contract.get_owner(args=[]).call().lower() == owner.address.lower()

    stats = contract.get_stats(args=[]).call()
    assert stats["total_staked"] == 0
    assert stats["staker_count"] == 0


# --------------------------------------------------------------------------- #
# Owner-only economic controls (deterministic, exercise consensus writes)     #
# --------------------------------------------------------------------------- #
def test_owner_can_set_apy():
    contract = _deploy()

    receipt = contract.set_apy(args=[2500]).transact()
    assert tx_execution_succeeded(receipt)
    assert contract.get_apy(args=[]).call() == 2500


def test_set_apy_rejects_out_of_range():
    contract = _deploy()
    receipt = contract.set_apy(args=[MAX_APY_BPS + 1]).transact()
    assert tx_execution_failed(receipt)


def test_non_owner_cannot_set_apy():
    contract = _deploy()
    stranger = get_accounts()[1]

    receipt = contract.connect(stranger).set_apy(args=[3000]).transact()
    assert tx_execution_failed(receipt)
    # APY unchanged.
    assert contract.get_apy(args=[]).call() == APY_BPS


def test_pause_blocks_staking():
    contract = _deploy()

    pause = contract.set_paused(args=[True]).transact()
    assert tx_execution_succeeded(pause)
    assert contract.is_paused(args=[]).call() is True

    # Even a normal deposit must be rejected by the _require_active() gate,
    # before the AI screen is ever consulted.
    blocked = contract.stake(args=[10 * TOKEN]).transact()
    assert tx_execution_failed(blocked)


def test_transfer_ownership():
    contract = _deploy()
    new_owner = get_accounts()[1]

    receipt = contract.transfer_ownership(args=[new_owner.address]).transact()
    assert tx_execution_succeeded(receipt)
    assert contract.get_owner(args=[]).call().lower() == new_owner.address.lower()


# --------------------------------------------------------------------------- #
# Full stake flow — real LLM risk screen settled through consensus            #
# --------------------------------------------------------------------------- #
def test_stake_passes_ai_risk_screen():
    """A plausibly-sized deposit at a sane APY should clear the AI screen and
    land in storage. This is the headline path: every validator independently
    queries the model and must agree on the derived risk band."""
    owner = get_default_account()
    contract = _deploy()

    receipt = contract.stake(args=[100 * TOKEN]).transact()
    assert tx_execution_succeeded(receipt)

    assert contract.balance_of(args=[owner.address]).call() == 100 * TOKEN
    stats = contract.get_stats(args=[]).call()
    assert stats["total_staked"] == 100 * TOKEN
    assert stats["staker_count"] == 1


def test_stake_rejects_non_positive():
    contract = _deploy()
    receipt = contract.stake(args=[0]).transact()
    assert tx_execution_failed(receipt)


def test_two_stakers_tracked_independently():
    contract = _deploy()
    owner = get_default_account()
    bob = get_accounts()[1]

    r1 = contract.stake(args=[100 * TOKEN]).transact()
    assert tx_execution_succeeded(r1)
    r2 = contract.connect(bob).stake(args=[50 * TOKEN]).transact()
    assert tx_execution_succeeded(r2)

    assert contract.balance_of(args=[owner.address]).call() == 100 * TOKEN
    assert contract.balance_of(args=[bob.address]).call() == 50 * TOKEN
    stats = contract.get_stats(args=[]).call()
    assert stats["total_staked"] == 150 * TOKEN
    assert stats["staker_count"] == 2


# --------------------------------------------------------------------------- #
# Live market APY fetch — real external HTTP, flaky/slow, opt-in              #
# --------------------------------------------------------------------------- #
@pytest.mark.slow
def test_update_apy_from_market_live():
    """Owner refreshes APY from the live DeFiLlama feed under consensus.

    Excluded by default (real network + external feed). Run with:
        gltest tests/integration/ -v -s -m slow
    """
    contract = _deploy()

    receipt = contract.update_apy_from_market(args=[]).transact()
    assert tx_execution_succeeded(receipt)

    new_apy = contract.get_apy(args=[]).call()
    assert 0 <= new_apy <= MAX_APY_BPS
