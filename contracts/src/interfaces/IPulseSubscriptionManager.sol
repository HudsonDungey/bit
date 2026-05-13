// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IPulseSubscriptionManager
/// @notice Pull-based ERC-20 subscription protocol.
///         Merchants create Plans; customers subscribe; anyone (typically
///         a Scheduler) calls charge() — all timing and cap enforcement
///         happens on-chain, Pulse never custodies funds.
interface IPulseSubscriptionManager {
    // ─── Errors ──────────────────────────────────────────────────────────────

    /// Plan does not exist or has been deactivated.
    error PlanNotActive(bytes32 planId);

    /// Customer already has an active subscription to this plan.
    /// subscriptionId is deterministic: keccak256(planId ‖ customer).
    error AlreadySubscribed(bytes32 subscriptionId);

    /// No active subscription found for this id.
    error NotSubscribed(bytes32 subscriptionId);

    /// charge() called before the subscription's next-charge timestamp.
    error TooEarlyToCharge(bytes32 subscriptionId, uint256 nextChargeAt);

    /// Charging would exceed the customer's optional total spend cap.
    error SpendCapExceeded(bytes32 subscriptionId);

    /// Plan amount exceeds the per-charge cap set when the plan was created.
    /// Defense-in-depth: guards against a merchant updating their own plan logic
    /// via a proxy or upgradeability attack.
    error PerChargeCapExceeded(bytes32 subscriptionId);

    /// Caller is not the plan's merchant.
    error UnauthorizedMerchant(bytes32 planId);

    /// A required address argument was the zero address.
    error ZeroAddress();

    /// amount must be > 0.
    error InvalidAmount();

    /// period must be > 0.
    error InvalidPeriod();

    /// feeBps must be ≤ 10 000 (100 %).
    error InvalidFeeBps();

    // ─── Events ──────────────────────────────────────────────────────────────

    event PlanCreated(
        bytes32 indexed planId,
        address indexed merchant,
        address token,
        uint256 amount,
        uint256 period,
        uint256 maxAmountPerCharge,
        uint16  feeBps
    );

    event PlanDeactivated(bytes32 indexed planId, address indexed merchant);

    event Subscribed(
        bytes32 indexed subscriptionId,
        bytes32 indexed planId,
        address indexed customer,
        uint256 totalSpendCap
    );

    /// Emitted on every successful charge.
    /// @param amount       Net amount transferred to the merchant.
    /// @param fee          Amount transferred to feeRecipient (may be 0).
    /// @param nextChargeAt Unix timestamp of the next allowed charge.
    event Charged(
        bytes32 indexed subscriptionId,
        address indexed customer,
        address indexed merchant,
        uint256 amount,
        uint256 fee,
        uint256 nextChargeAt
    );

    event Cancelled(bytes32 indexed subscriptionId, address indexed customer);

    // ─── Structs ─────────────────────────────────────────────────────────────

    struct Plan {
        address merchant;
        address token;
        uint256 amount;           // gross amount (includes fee) per charge
        uint256 period;           // min seconds between charges
        uint256 maxAmountPerCharge; // hard cap the contract enforces per call
        uint16  feeBps;           // protocol fee in basis points (e.g. 100 = 1 %)
        bool    active;
    }

    struct Subscription {
        bytes32 planId;
        address customer;
        uint256 nextChargeAt;   // unix timestamp of next allowed charge
        uint256 totalSpent;     // cumulative gross amount charged so far
        uint256 totalSpendCap;  // 0 = unlimited; set by customer at subscribe time
        bool    active;
    }

    // ─── Functions ───────────────────────────────────────────────────────────

    function createPlan(
        address token,
        uint256 amount,
        uint256 period,
        uint256 maxAmountPerCharge,
        uint16  feeBps
    ) external returns (bytes32 planId);

    function subscribe(
        bytes32 planId,
        uint256 totalSpendCap
    ) external returns (bytes32 subscriptionId);

    function charge(bytes32 subscriptionId) external;

    function cancel(bytes32 subscriptionId) external;

    function deactivatePlan(bytes32 planId) external;

    function getPlan(bytes32 planId)
        external view returns (Plan memory);

    function getSubscription(bytes32 subscriptionId)
        external view returns (Subscription memory);
}
