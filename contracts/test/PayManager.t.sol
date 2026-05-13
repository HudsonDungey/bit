// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PayManager} from "../src/PayManager.sol";
import {MockUSDC} from "../src/test-helpers/MockUSDC.sol";

/// @dev Run with:  forge test --root contracts -vv
contract PayManagerTest is Test {
    PayManager internal pm;
    MockUSDC   internal usdc;

    address internal OWNER   = makeAddr("owner");
    address internal ALICE   = makeAddr("alice");
    address internal BOB     = makeAddr("bob");
    address internal CAROL   = makeAddr("carol");

    uint256 internal constant GROSS = 100e6; // 100 USDC

    function setUp() public {
        usdc = new MockUSDC();
        pm   = new PayManager(OWNER);

        // Fund ALICE and approve PayManager
        usdc.mint(ALICE, 10_000e6);
        vm.prank(ALICE);
        usdc.approve(address(pm), type(uint256).max);
    }

    // ─── Payee registry ───────────────────────────────────────────────────────

    function test_addPayee() public {
        vm.prank(ALICE);
        pm.addPayee(BOB, "Bob");

        (address[] memory addrs, string[] memory labels) = pm.getPayees(ALICE);
        assertEq(addrs.length, 1,     "should have 1 payee");
        assertEq(addrs[0],     BOB,   "payee address mismatch");
        assertEq(labels[0],    "Bob", "payee label mismatch");
    }

    function test_removePayee() public {
        vm.startPrank(ALICE);
        pm.addPayee(BOB,   "Bob");
        pm.addPayee(CAROL, "Carol");
        pm.removePayee(BOB);
        vm.stopPrank();

        (address[] memory addrs,) = pm.getPayees(ALICE);
        assertEq(addrs.length, 1,       "should have 1 payee after removal");
        assertEq(addrs[0],     CAROL,   "remaining payee should be Carol");
    }

    function test_getPayees() public {
        vm.startPrank(ALICE);
        pm.addPayee(BOB,   "Bob");
        pm.addPayee(CAROL, "Carol");
        vm.stopPrank();

        (address[] memory addrs, string[] memory labels) = pm.getPayees(ALICE);
        assertEq(addrs.length,  2,       "should have 2 payees");
        assertEq(addrs[0],      BOB,     "first payee");
        assertEq(labels[0],     "Bob",   "first label");
        assertEq(addrs[1],      CAROL,   "second payee");
        assertEq(labels[1],     "Carol", "second label");
    }

    function test_addPayee_duplicate_reverts() public {
        vm.startPrank(ALICE);
        pm.addPayee(BOB, "Bob");

        vm.expectRevert(PayManager.AlreadyPayee.selector);
        pm.addPayee(BOB, "Bob Again");
        vm.stopPrank();
    }

    function test_removePayee_notFound_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(PayManager.NotPayee.selector);
        pm.removePayee(BOB);
    }

    // ─── Payments ─────────────────────────────────────────────────────────────

    function test_pay_feeDistribution() public {
        uint256 bobBefore   = usdc.balanceOf(BOB);
        uint256 ownerBefore = usdc.balanceOf(OWNER);
        uint256 aliceBefore = usdc.balanceOf(ALICE);

        vm.prank(ALICE);
        pm.pay(address(usdc), BOB, GROSS);

        uint256 fee = (GROSS * 50) / 10_000; // 0.5% = 0.5 USDC
        uint256 net = GROSS - fee;            // 99.5 USDC

        assertEq(usdc.balanceOf(BOB)   - bobBefore,   net,   "recipient net");
        assertEq(usdc.balanceOf(OWNER) - ownerBefore, fee,   "owner fee");
        assertEq(aliceBefore - usdc.balanceOf(ALICE), GROSS, "sender gross");
    }

    function test_payBatch_multipleRecipients() public {
        address[] memory recipients = new address[](2);
        uint256[] memory amounts    = new uint256[](2);
        recipients[0] = BOB;
        recipients[1] = CAROL;
        amounts[0]    = 100e6;
        amounts[1]    = 200e6;

        uint256 bobBefore   = usdc.balanceOf(BOB);
        uint256 carolBefore = usdc.balanceOf(CAROL);
        uint256 ownerBefore = usdc.balanceOf(OWNER);

        vm.prank(ALICE);
        pm.payBatch(address(usdc), recipients, amounts);

        uint256 fee1 = (100e6 * 50) / 10_000;
        uint256 fee2 = (200e6 * 50) / 10_000;

        assertEq(usdc.balanceOf(BOB)   - bobBefore,   100e6 - fee1,     "bob net");
        assertEq(usdc.balanceOf(CAROL) - carolBefore, 200e6 - fee2,     "carol net");
        assertEq(usdc.balanceOf(OWNER) - ownerBefore, fee1 + fee2,      "total fees");
    }
}
