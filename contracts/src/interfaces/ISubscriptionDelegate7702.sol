// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISubscriptionDelegate7702
/// @notice Interface for the EIP-7702 subscription delegation target.
///         When an EOA sets this contract as its delegate via a Type 4 tx,
///         address(this) == the EOA — all token balances belong to the EOA.
interface ISubscriptionDelegate7702 {
    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotManager();
    error WrongToken();
    error PeriodCapExceeded();
    error InvalidSignature();
    error Expired();
    error NonceUsed();
    error AlreadyInitialized();
    error NotOwner();
    error ZeroAddress();

    // ─── Events ───────────────────────────────────────────────────────────────

    event Initialized(
        address indexed manager,
        address indexed token,
        uint256 maxPerPeriod,
        uint256 periodDuration
    );
    event TransferExecuted(
        address indexed to,
        uint256 amount,
        uint256 periodId,
        uint256 spentInPeriod
    );
    event Revoked(uint256 newEpoch);

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Config {
        address manager;
        address token;
        uint256 maxPerPeriod;
        uint256 periodDuration;
        uint256 initEpoch;
        uint256 nonce;
    }

    struct DelegateInit {
        address manager;
        address token;
        uint256 maxPerPeriod;
        uint256 periodDuration;
        uint256 nonce;
        uint256 expiry;
    }

    // ─── Functions ───────────────────────────────────────────────────────────

    /// @notice Initialize via EIP-712 signed parameters.
    function initWithSig(DelegateInit calldata init, bytes calldata sig) external;

    /// @notice Transfer tokens from this EOA to `to`. Only callable by manager.
    function executeTransfer(address token, address to, uint256 amount) external;

    /// @notice Revoke this delegation. Must be called by address(this).
    function revoke() external;

    /// @notice Returns true if initialized and not revoked.
    function isInitialized() external view returns (bool);

    /// @notice Current period id based on block.timestamp.
    function currentPeriodId() external view returns (uint256);

    /// @notice Remaining allowance for the current period.
    function remainingPeriodAllowance() external view returns (uint256);

    /// @notice Current config.
    function config() external view returns (Config memory);

    /// @notice Current auth epoch (incremented on revoke).
    function authEpoch() external view returns (uint256);

    /// @notice Tokens spent in a given period.
    function spentInPeriod(uint256 periodId) external view returns (uint256);
}
