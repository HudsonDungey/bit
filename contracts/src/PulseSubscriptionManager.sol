// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// PulseSubscriptionManager
//
// Pull-based ERC-20 subscription protocol.
//
// Key design invariants:
//   1. charge() is permissionless — any address may call it and earns
//      EXECUTOR_FEE_BPS (0.1%) as an incentive to run a keeper bot.
//   2. Checks-Effects-Interactions (CEI) ordering in charge():
//      every state mutation happens before any external token call.
//   3. nonReentrant guard (uint256 1/2 pattern) for defense-in-depth.
//   4. subscriptionId = keccak256(planId ‖ customer) — deterministic.
//   5. Subscriptions are denormalized at subscribe() time: merchant, token,
//      amount, period, feeBps are copied from the plan so the subscription
//      remains valid even if the plan is later modified.
//   6. nextChargeAt += period (additive, no timestamp drift).
//   7. planId includes block.chainid to prevent cross-chain replay.
//   8. Spend cap exceeded → auto-cancel (emit Cancelled), NOT revert.
//   9. cancel() callable by customer OR merchant.
//  10. Direct transferFrom: customer → merchant / executor / feeRecipient
//      (no intermediate custody).
// ─────────────────────────────────────────────────────────────────────────────

import {IPulseSubscriptionManager} from "./interfaces/IPulseSubscriptionManager.sol";

/// @dev Minimal ERC-20 interface (only what we call).
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract PulseSubscriptionManager is IPulseSubscriptionManager {
    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Basis points awarded to the permissionless executor on each charge.
    uint16 public constant EXECUTOR_FEE_BPS = 10; // 0.1%

    // ─── State ────────────────────────────────────────────────────────────────

    address public owner;
    address public feeRecipient;

    /// @dev Monotonic nonce used to make planIds unique per merchant + chain.
    uint256 private _planNonce;

    /// @dev Re-entrancy lock: 1 = not entered, 2 = entered.
    uint256 private _reentrancyStatus;

    mapping(bytes32 => Plan)         public plans;
    mapping(bytes32 => Subscription) public subscriptions;

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier nonReentrant() {
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
        owner             = msg.sender;
        feeRecipient      = _feeRecipient;
        _reentrancyStatus = 1;
    }

    // ─── Plan management ─────────────────────────────────────────────────────

    /// @notice Merchant creates a subscription plan.
    /// @param token   ERC-20 token customers will pay in.
    /// @param amount  Gross amount (fee-inclusive) per charge.
    /// @param period  Minimum seconds between consecutive charges.
    /// @param feeBps  Protocol fee in basis points sent to feeRecipient.
    function createPlan(
        address token,
        uint256 amount,
        uint256 period,
        uint16  feeBps
    ) external returns (bytes32 planId) {
        if (token  == address(0)) revert ZeroAddress();
        if (amount == 0)          revert InvalidAmount();
        if (period == 0)          revert InvalidPeriod();
        if (feeBps >  10_000)     revert InvalidFeeBps();

        // planId includes chainid so the same merchant nonce produces different
        // ids across chains, preventing cross-chain subscription replays.
        planId = keccak256(abi.encodePacked(msg.sender, ++_planNonce, block.chainid));

        plans[planId] = Plan({
            merchant: msg.sender,
            token:    token,
            amount:   amount,
            period:   period,
            feeBps:   feeBps,
            active:   true
        });

        emit PlanCreated(planId, msg.sender, token, amount, period, feeBps);
    }

    /// @notice Merchant deactivates a plan.  Existing subscriptions are
    ///         unaffected (they hold their own denormalized copy of the params)
    ///         but callers may inspect the plan's active flag before charging.
    function deactivatePlan(bytes32 planId) external {
        Plan storage plan = plans[planId];
        if (plan.merchant != msg.sender) revert UnauthorizedMerchant(planId);
        if (!plan.active)                revert PlanNotActive(planId);

        plan.active = false;
        emit PlanDeactivated(planId, msg.sender);
    }

    // ─── Subscription lifecycle ───────────────────────────────────────────────

    /// @notice Customer subscribes to a plan.
    ///         Subscription fields are denormalized from the plan so future
    ///         plan updates cannot affect existing subscriptions.
    /// @param planId        Plan to subscribe to.
    /// @param totalSpendCap Maximum lifetime spend; 0 = unlimited.
    function subscribe(
        bytes32 planId,
        uint256 totalSpendCap
    ) external returns (bytes32 subscriptionId) {
        Plan storage plan = plans[planId];
        if (!plan.active) revert PlanNotActive(planId);

        subscriptionId = _subId(planId, msg.sender);
        if (subscriptions[subscriptionId].active) revert AlreadySubscribed(subscriptionId);

        // Denormalize plan params into the subscription so the subscription
        // remains valid even if the plan is later modified or deactivated.
        subscriptions[subscriptionId] = Subscription({
            customer:      msg.sender,
            merchant:      plan.merchant,
            token:         plan.token,
            amount:        plan.amount,
            period:        plan.period,
            nextChargeAt:  block.timestamp, // immediately chargeable
            totalSpendCap: totalSpendCap,
            totalSpent:    0,
            feeBps:        plan.feeBps,
            active:        true
        });

        emit Subscribed(subscriptionId, planId, msg.sender, totalSpendCap);
    }

    /// @notice Cancel a subscription.  Callable by the customer OR merchant.
    function cancel(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        if (!sub.active) revert NotSubscribed(subscriptionId);
        if (msg.sender != sub.customer && msg.sender != sub.merchant)
            revert NotSubscribed(subscriptionId);

        sub.active = false;
        emit Cancelled(subscriptionId, msg.sender);
    }

    // ─── Charging ────────────────────────────────────────────────────────────

    /// @notice Charge a due subscription.  Permissionless — any address may
    ///         call and earns EXECUTOR_FEE_BPS (0.1%) of the gross amount.
    ///
    /// Fee split (example: gross = 10 USDC, feeBps = 90):
    ///   executorFee  = gross * EXECUTOR_FEE_BPS / 10_000  = 0.01 USDC
    ///   protocolFee  = gross * plan.feeBps      / 10_000  = 0.09 USDC
    ///   merchantAmt  = gross - executorFee - protocolFee  = 9.90 USDC
    ///
    /// CEI ordering:
    ///   CHECKS  — revert if not chargeable
    ///   EFFECTS — update nextChargeAt, totalSpent, optionally deactivate
    ///   INTERACTIONS — transferFrom calls last
    function charge(bytes32 subscriptionId) external nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];

        // ── CHECKS ────────────────────────────────────────────────────────────
        if (!sub.active) revert NotSubscribed(subscriptionId);

        if (block.timestamp < sub.nextChargeAt)
            revert TooEarlyToCharge(subscriptionId, sub.nextChargeAt);

        uint256 amount = sub.amount;

        // ── EFFECTS (all state mutations before any external call) ────────────

        // Additive nextChargeAt: no drift if calls are late.
        uint256 nextChargeAt = sub.nextChargeAt + sub.period;
        sub.nextChargeAt  = nextChargeAt;
        sub.totalSpent   += amount;

        // Spend cap: auto-cancel instead of revert so the executor's tx
        // succeeds and the subscription is cleaned up gracefully.
        if (sub.totalSpendCap != 0 && sub.totalSpent > sub.totalSpendCap) {
            sub.active = false;
            emit Cancelled(subscriptionId, address(this));
            return;
        }

        address customer  = sub.customer;
        address merchant  = sub.merchant;
        address token     = sub.token;
        uint16  feeBps    = sub.feeBps;
        address executor  = msg.sender;

        // ── INTERACTIONS ──────────────────────────────────────────────────────
        // Direct transferFrom: no intermediate custody.
        uint256 execFee     = (amount * EXECUTOR_FEE_BPS) / 10_000;
        uint256 protocolFee = (amount * feeBps)           / 10_000;
        uint256 merchantAmt = amount - execFee - protocolFee;

        _safeTransferFrom(token, customer, merchant, merchantAmt);
        if (execFee > 0)     _safeTransferFrom(token, customer, executor,    execFee);
        if (protocolFee > 0) _safeTransferFrom(token, customer, feeRecipient, protocolFee);

        emit ChargeExecuted(
            subscriptionId,
            executor,
            customer,
            amount,
            merchantAmt,
            execFee,
            protocolFee,
            nextChargeAt
        );
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

    /// @notice Compute the deterministic subscription id for a (plan, customer) pair.
    function computeSubId(bytes32 planId, address customer)
        external pure returns (bytes32)
    {
        return _subId(planId, customer);
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

    function _subId(bytes32 planId, address customer) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(planId, customer));
    }

    /// @dev Calls transferFrom and reverts if it returns false or reverts.
    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(0x23b872dd, from, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "Pulse: transferFrom failed");
    }
}
