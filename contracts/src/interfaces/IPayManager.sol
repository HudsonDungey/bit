// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IPayManager
/// @notice Interface for the PayManager payroll contract.
///         0.5% fee on every payment goes to `owner`.
interface IPayManager {
    // ─── Errors ───────────────────────────────────────────────────────────────

    error ZeroAddress();
    error ZeroAmount();
    error AlreadyPayee();
    error NotPayee();
    error LengthMismatch();
    error TransferFailed();

    // ─── Events ───────────────────────────────────────────────────────────────

    event PayeeAdded(address indexed user, address indexed payee, string label);
    event PayeeRemoved(address indexed user, address indexed payee);
    event Payment(
        address indexed from,
        address indexed to,
        address token,
        uint256 gross,
        uint256 fee,
        uint256 net
    );

    // ─── Functions ───────────────────────────────────────────────────────────

    /// @notice Fee in basis points (50 = 0.5%).
    function FEE_BPS() external view returns (uint256);

    /// @notice Fee recipient.
    function owner() external view returns (address);

    /// @notice Add a payee to the caller's registry.
    function addPayee(address payee, string calldata label) external;

    /// @notice Remove a payee from the caller's registry.
    function removePayee(address payee) external;

    /// @notice Return all payees and their labels for a given user.
    function getPayees(address user)
        external view returns (address[] memory addrs, string[] memory labels);

    /// @notice Send tokens from caller to `to`, deducting 0.5% fee.
    function pay(address token, address to, uint256 gross) external;

    /// @notice Batch payment.
    function payBatch(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external;

    /// @notice Human-readable label for a (user, payee) pair.
    function payeeLabel(address user, address payee) external view returns (string memory);
}
