// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// PayManager
//
// Payroll-style payment manager.  0.5% fee (50 bps) on every payment goes
// to `owner`.  Users maintain a payee registry (on-chain address book) and
// can execute single or batch payments in any ERC-20 token.
// ─────────────────────────────────────────────────────────────────────────────

contract PayManager {
    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant FEE_BPS = 50; // 0.5%

    // ─── State ────────────────────────────────────────────────────────────────

    address public immutable owner;

    /// @dev Ordered list of payee addresses per user.
    mapping(address user => address[]) private _payeeList;

    /// @dev 1-indexed slot of each payee for O(1) existence check + removal.
    mapping(address user => mapping(address payee => uint256)) private _payeeIdx;

    /// @dev Human-readable label per (user, payee) pair.
    mapping(address user => mapping(address payee => string)) public payeeLabel;

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

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _owner) {
        if (_owner == address(0)) revert ZeroAddress();
        owner = _owner;
    }

    // ─── Payee registry ───────────────────────────────────────────────────────

    /// @notice Add a payee to the caller's registry.
    function addPayee(address payee, string calldata label) external {
        if (payee == address(0)) revert ZeroAddress();
        if (_payeeIdx[msg.sender][payee] != 0) revert AlreadyPayee();

        _payeeList[msg.sender].push(payee);
        _payeeIdx[msg.sender][payee] = _payeeList[msg.sender].length; // 1-indexed
        payeeLabel[msg.sender][payee] = label;

        emit PayeeAdded(msg.sender, payee, label);
    }

    /// @notice Remove a payee from the caller's registry (O(1) swap-and-pop).
    function removePayee(address payee) external {
        uint256 idx = _payeeIdx[msg.sender][payee];
        if (idx == 0) revert NotPayee();

        address[] storage list = _payeeList[msg.sender];
        uint256 lastIdx = list.length; // 1-indexed position of last element

        if (idx != lastIdx) {
            // Swap the target with the last element
            address last = list[lastIdx - 1];
            list[idx - 1] = last;
            _payeeIdx[msg.sender][last] = idx;
        }

        list.pop();
        delete _payeeIdx[msg.sender][payee];
        delete payeeLabel[msg.sender][payee];

        emit PayeeRemoved(msg.sender, payee);
    }

    /// @notice Return all payees and their labels for a given user.
    function getPayees(address user)
        external
        view
        returns (address[] memory addrs, string[] memory labels)
    {
        addrs  = _payeeList[user];
        labels = new string[](addrs.length);
        for (uint256 i = 0; i < addrs.length; i++) {
            labels[i] = payeeLabel[user][addrs[i]];
        }
    }

    // ─── Payments ─────────────────────────────────────────────────────────────

    /// @notice Send `gross` tokens from caller to `to`, deducting 0.5% fee.
    function pay(address token, address to, uint256 gross) external {
        _pay(token, msg.sender, to, gross);
    }

    /// @notice Batch payment.  Arrays must be the same length.
    function payBatch(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        if (recipients.length != amounts.length) revert LengthMismatch();
        for (uint256 i = 0; i < recipients.length; i++) {
            _pay(token, msg.sender, recipients[i], amounts[i]);
        }
    }

    // ─── Internals ────────────────────────────────────────────────────────────

    function _pay(
        address token,
        address from,
        address to,
        uint256 gross
    ) internal {
        if (to == address(0)) revert ZeroAddress();
        if (gross == 0)       revert ZeroAmount();

        uint256 fee = (gross * FEE_BPS) / 10_000;
        uint256 net = gross - fee;

        _transferFrom(token, from, to,    net);
        if (fee > 0) _transferFrom(token, from, owner, fee);

        emit Payment(from, to, token, gross, fee, net);
    }

    function _transferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(0x23b872dd, from, to, amount)
        );
        if (!(ok && (data.length == 0 || abi.decode(data, (bool))))) revert TransferFailed();
    }
}
