// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// PulseSubscriptionManager
//
// Pull-based ERC-20 subscription protocol.
//
// Key design invariants:
//   1. Checks-Effects-Interactions (CEI) ordering in charge():
//      every state mutation happens before any external token call.
//      This prevents re-entrancy exploits even if the token has hooks
//      (ERC-777, ERC-1363, etc.).
//   2. nonReentrant guard provides defense-in-depth on top of CEI.
//   3. subscriptionId = keccak256(planId ‖ customer) — deterministic,
//      prevents a customer subscribing to the same plan twice.
//   4. totalSpendCap = 0 means unlimited (opt-in, not forced).
//   5. Two-step transfer: pull gross amount into contract first, then
//      distribute.  Simplifies allowance math — customer approves the
//      contract for exactly `totalSpendCap` (or an amount of their choice).
//   6. Same bytecode → same CREATE2 address on every chain.
// ─────────────────────────────────────────────────────────────────────────────

import {IPulseSubscriptionManager} from "./interfaces/IPulseSubscriptionManager.sol";

/// @dev Minimal ERC-20 interface (only what we call).
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract PulseSubscriptionManager is IPulseSubscriptionManager {
    // ─── State ────────────────────────────────────────────────────────────────

    address public owner;
    address public feeRecipient;

    /// @dev Monotonic nonce used to make planIds unique per merchant.
    uint256 private _planNonce;

    /// @dev Re-entrancy lock: 1 = not entered, 2 = entered.
    uint256 private _reentrancyStatus;

    mapping(bytes32 => Plan)         public plans;
    mapping(bytes32 => Subscription) public subscriptions;

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier nonReentrant() {
        // INVARIANT: prevents re-entrant calls from callback tokens.
        require(_reentrancyStatus != 2, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Pulse: not owner");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _feeRecipient) {
        if (_feeRecipient == address(0)) revert ZeroAddress();
        owner        = msg.sender;
        feeRecipient = _feeRecipient;
        _reentrancyStatus = 1;
    }

    // ─── Plan management ─────────────────────────────────────────────────────

    /// @notice Merchant creates a subscription plan.
    /// @param token              ERC-20 token customers will pay in.
    /// @param amount             Gross amount (fee-inclusive) per charge.
    /// @param period             Minimum seconds between consecutive charges.
    /// @param maxAmountPerCharge Hard per-charge cap enforced by the contract
    ///                           (should equal `amount`; defense against
    ///                            future plan tampering via proxies).
    /// @param feeBps             Protocol fee in basis points sent to
    ///                           `feeRecipient`.  Merchant sets this — a
    ///                           future version will enforce a protocol max.
    function createPlan(
        address token,
        uint256 amount,
        uint256 period,
        uint256 maxAmountPerCharge,
        uint16  feeBps
    ) external returns (bytes32 planId) {
        if (token  == address(0)) revert ZeroAddress();
        if (amount == 0)          revert InvalidAmount();
        if (period == 0)          revert InvalidPeriod();
        if (feeBps >  10_000)     revert InvalidFeeBps();

        // planId is deterministic for a given merchant + nonce, so no two
        // plans share an id even if all other params are identical.
        planId = keccak256(abi.encodePacked(msg.sender, ++_planNonce));

        plans[planId] = Plan({
            merchant:           msg.sender,
            token:              token,
            amount:             amount,
            period:             period,
            maxAmountPerCharge: maxAmountPerCharge,
            feeBps:             feeBps,
            active:             true
        });

        emit PlanCreated(planId, msg.sender, token, amount, period, maxAmountPerCharge, feeBps);
    }

    /// @notice Merchant deactivates a plan.  Existing subscriptions can no
    ///         longer be charged; customers may still cancel.
    function deactivatePlan(bytes32 planId) external {
        Plan storage plan = plans[planId];
        // INVARIANT: only the original merchant can deactivate.
        if (plan.merchant != msg.sender) revert UnauthorizedMerchant(planId);
        if (!plan.active)                revert PlanNotActive(planId);

        plan.active = false;
        emit PlanDeactivated(planId, msg.sender);
    }

    // ─── Subscription lifecycle ───────────────────────────────────────────────

    /// @notice Customer subscribes to a plan.
    ///         The customer must have already approved this contract to spend
    ///         at least `totalSpendCap` (or unlimited if cap is 0) of the
    ///         plan's token.
    /// @param planId        Plan to subscribe to.
    /// @param totalSpendCap Maximum lifetime spend; 0 = unlimited.
    function subscribe(
        bytes32 planId,
        uint256 totalSpendCap
    ) external returns (bytes32 subscriptionId) {
        Plan storage plan = plans[planId];
        if (!plan.active) revert PlanNotActive(planId);

        // INVARIANT: one subscription per (plan, customer) pair.
        subscriptionId = _subId(planId, msg.sender);
        if (subscriptions[subscriptionId].active) revert AlreadySubscribed(subscriptionId);

        subscriptions[subscriptionId] = Subscription({
            planId:        planId,
            customer:      msg.sender,
            nextChargeAt:  block.timestamp, // immediately chargeable
            totalSpent:    0,
            totalSpendCap: totalSpendCap,
            active:        true
        });

        emit Subscribed(subscriptionId, planId, msg.sender, totalSpendCap);
    }

    /// @notice Cancel a subscription.  Only the subscriber can cancel.
    function cancel(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        if (!sub.active || sub.customer != msg.sender) revert NotSubscribed(subscriptionId);

        // EFFECT before no external interaction needed here.
        sub.active = false;
        emit Cancelled(subscriptionId, msg.sender);
    }

    // ─── Charging ────────────────────────────────────────────────────────────

    /// @notice Charge a due subscription.  Anyone may call — typically the
    ///         Pulse Scheduler.  All business logic enforced here, on-chain.
    ///
    /// CEI ordering:
    ///   CHECKS  — revert if not chargeable
    ///   EFFECTS — update nextChargeAt, totalSpent (before any external call)
    ///   INTERACTIONS — token transfers last
    function charge(bytes32 subscriptionId) external nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];

        // ── CHECKS ────────────────────────────────────────────────────────────
        if (!sub.active) revert NotSubscribed(subscriptionId);

        Plan storage plan = plans[sub.planId];
        if (!plan.active) revert PlanNotActive(sub.planId);

        // Timing: must wait at least `period` seconds since last charge.
        if (block.timestamp < sub.nextChargeAt)
            revert TooEarlyToCharge(subscriptionId, sub.nextChargeAt);

        uint256 amount = plan.amount;

        // Per-charge cap: defense-in-depth against plan logic drift.
        // INVARIANT: amount can never exceed what was committed at plan creation.
        if (amount > plan.maxAmountPerCharge)
            revert PerChargeCapExceeded(subscriptionId);

        // Total spend cap: customer's opt-in lifetime limit.
        if (sub.totalSpendCap != 0 && sub.totalSpent + amount > sub.totalSpendCap)
            revert SpendCapExceeded(subscriptionId);

        // ── EFFECTS (all state mutations before any external call) ────────────
        uint256 nextChargeAt = block.timestamp + plan.period;
        sub.nextChargeAt = nextChargeAt;
        sub.totalSpent  += amount;

        // ── INTERACTIONS ──────────────────────────────────────────────────────
        // Pull the gross amount from the customer into this contract first.
        // This avoids needing the customer to approve both the merchant and
        // feeRecipient — one approval to this contract is sufficient.
        _safeTransferFrom(plan.token, sub.customer, address(this), amount);

        uint256 fee            = (amount * plan.feeBps) / 10_000;
        uint256 merchantAmount = amount - fee;

        _safeTransfer(plan.token, plan.merchant, merchantAmount);
        if (fee > 0) _safeTransfer(plan.token, feeRecipient, fee);

        emit Charged(subscriptionId, sub.customer, plan.merchant, merchantAmount, fee, nextChargeAt);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getPlan(bytes32 planId) external view returns (Plan memory) {
        return plans[planId];
    }

    function getSubscription(bytes32 subscriptionId)
        external view returns (Subscription memory)
    {
        return subscriptions[subscriptionId];
    }

    // ─── Owner ────────────────────────────────────────────────────────────────

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newRecipient;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// @dev Deterministic subscription id.  One per (plan, customer) pair.
    function _subId(bytes32 planId, address customer) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(planId, customer));
    }

    /// @dev Calls transferFrom and reverts if it returns false or reverts.
    ///      Guards against non-standard tokens that return false instead of reverting.
    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "Pulse: transferFrom failed");
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "Pulse: transfer failed");
    }
}
