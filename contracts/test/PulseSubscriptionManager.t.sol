// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PulseSubscriptionManager} from "../src/PulseSubscriptionManager.sol";
import {IPulseSubscriptionManager} from "../src/interfaces/IPulseSubscriptionManager.sol";
import {MockUSDC} from "../src/test-helpers/MockUSDC.sol";

/// @dev Run with:  forge test --root contracts -vv
contract PulseSubscriptionManagerTest is Test {
    PulseSubscriptionManager internal mgr;
    MockUSDC                 internal usdc;

    address internal OWNER      = makeAddr("owner");
    address internal FEE_RECIP  = makeAddr("feeRecipient");
    address internal MERCHANT   = makeAddr("merchant");
    address internal CUSTOMER   = makeAddr("customer");
    address internal STRANGER   = makeAddr("stranger");

    uint256 internal constant AMOUNT        = 10e6;    // 10 USDC
    uint256 internal constant PERIOD        = 30 days;
    uint16  internal constant FEE_BPS       = 90;      // protocol fee 0.9%
    uint16  internal constant EXECUTOR_FEE_BPS = 10;   // executor fee 0.1%

    bytes32 internal planId;
    bytes32 internal subId;

    function setUp() public {
        vm.startPrank(OWNER);
        usdc = new MockUSDC();
        mgr  = new PulseSubscriptionManager(FEE_RECIP);
        vm.stopPrank();

        // Merchant creates a plan
        vm.prank(MERCHANT);
        planId = mgr.createPlan(address(usdc), AMOUNT, PERIOD, FEE_BPS);

        // Compute expected subscriptionId
        subId = keccak256(abi.encodePacked(planId, CUSTOMER));

        // Fund and approve customer
        usdc.mint(CUSTOMER, 1000e6);
        vm.prank(CUSTOMER);
        usdc.approve(address(mgr), type(uint256).max);
    }

    // ─── Plan creation ────────────────────────────────────────────────────────

    function test_createPlan_emitsEvent() public {
        // The next planId will use nonce=2 (setUp used nonce=1)
        bytes32 expectedPlanId = keccak256(abi.encodePacked(MERCHANT, uint256(2), block.chainid));

        vm.expectEmit(true, true, false, true);
        emit IPulseSubscriptionManager.PlanCreated(
            expectedPlanId,
            MERCHANT,
            address(usdc),
            AMOUNT,
            PERIOD,
            FEE_BPS
        );
        vm.prank(MERCHANT);
        mgr.createPlan(address(usdc), AMOUNT, PERIOD, FEE_BPS);
    }

    // ─── Subscription denormalization ─────────────────────────────────────────

    function test_subscribe_denormalizesFromPlan() public {
        vm.prank(CUSTOMER);
        bytes32 returnedId = mgr.subscribe(planId, 0);

        assertEq(returnedId, subId, "subscriptionId mismatch");

        IPulseSubscriptionManager.Subscription memory sub = mgr.getSubscription(subId);
        assertEq(sub.customer,  CUSTOMER,       "customer mismatch");
        assertEq(sub.merchant,  MERCHANT,       "merchant mismatch");
        assertEq(sub.token,     address(usdc),  "token mismatch");
        assertEq(sub.amount,    AMOUNT,         "amount mismatch");
        assertEq(sub.period,    PERIOD,         "period mismatch");
        assertEq(sub.feeBps,    FEE_BPS,        "feeBps mismatch");
        assertEq(sub.totalSpent, 0,             "totalSpent should be 0");
        assertTrue(sub.active,                  "should be active");
    }

    // ─── Permissionless charge ────────────────────────────────────────────────

    function test_charge_permissionless() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        uint256 strangerBefore = usdc.balanceOf(STRANGER);

        vm.prank(STRANGER);
        mgr.charge(subId);

        uint256 execFee = (AMOUNT * EXECUTOR_FEE_BPS) / 10_000;
        assertGt(usdc.balanceOf(STRANGER), strangerBefore, "STRANGER should earn executor fee");
        assertEq(usdc.balanceOf(STRANGER) - strangerBefore, execFee, "executor fee mismatch");
    }

    // ─── Fee distribution ────────────────────────────────────────────────────

    function test_charge_feeDistribution() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        uint256 merchantBefore  = usdc.balanceOf(MERCHANT);
        uint256 feeBefore       = usdc.balanceOf(FEE_RECIP);
        uint256 executorBefore  = usdc.balanceOf(STRANGER);
        uint256 customerBefore  = usdc.balanceOf(CUSTOMER);

        vm.prank(STRANGER);
        mgr.charge(subId);

        uint256 execFee     = (AMOUNT * EXECUTOR_FEE_BPS) / 10_000; // 0.1% = 0.01 USDC
        uint256 protocolFee = (AMOUNT * FEE_BPS)          / 10_000; // 0.9% = 0.09 USDC
        uint256 merchantAmt = AMOUNT - execFee - protocolFee;        // 9.90 USDC

        assertEq(usdc.balanceOf(MERCHANT)  - merchantBefore,  merchantAmt,  "merchant delta");
        assertEq(usdc.balanceOf(FEE_RECIP) - feeBefore,       protocolFee,  "protocol fee delta");
        assertEq(usdc.balanceOf(STRANGER)  - executorBefore,  execFee,      "executor fee delta");
        assertEq(customerBefore - usdc.balanceOf(CUSTOMER),   AMOUNT,       "customer delta");
    }

    // ─── nextChargeAt no-drift ────────────────────────────────────────────────

    function test_charge_nextChargeAt_noFreezing() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        // First charge at t=0
        uint256 t0 = block.timestamp;
        mgr.charge(subId);

        IPulseSubscriptionManager.Subscription memory sub = mgr.getSubscription(subId);
        assertEq(sub.nextChargeAt, t0 + PERIOD, "first nextChargeAt = t0 + period");

        // Warp forward 2 periods (late charge)
        vm.warp(t0 + PERIOD * 2);
        mgr.charge(subId);

        sub = mgr.getSubscription(subId);
        // nextChargeAt advances from the previous nextChargeAt, not block.timestamp
        assertEq(sub.nextChargeAt, t0 + PERIOD * 2, "second nextChargeAt = t0 + 2*period (no drift)");
    }

    // ─── TooEarlyToCharge ─────────────────────────────────────────────────────

    function test_charge_tooEarly() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);
        mgr.charge(subId); // first charge succeeds

        uint256 nextChargeAt = mgr.getSubscription(subId).nextChargeAt;

        vm.expectRevert(
            abi.encodeWithSelector(
                IPulseSubscriptionManager.TooEarlyToCharge.selector,
                subId,
                nextChargeAt
            )
        );
        mgr.charge(subId);
    }

    // ─── Spend cap auto-cancel ────────────────────────────────────────────────

    function test_charge_spendCap_autocancels() public {
        // Cap = exactly one charge worth
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, AMOUNT);

        // First charge: totalSpent becomes AMOUNT == cap, but NOT exceeded yet
        mgr.charge(subId);
        assertTrue(mgr.getSubscription(subId).active, "should still be active after first charge");

        vm.warp(block.timestamp + PERIOD);

        // Second charge: totalSpent would become 2*AMOUNT > cap → auto-cancel
        vm.expectEmit(true, false, false, false);
        emit IPulseSubscriptionManager.Cancelled(subId, address(mgr));
        mgr.charge(subId);

        assertFalse(mgr.getSubscription(subId).active, "should be cancelled after cap exceeded");
    }

    // ─── Cancellation by merchant ─────────────────────────────────────────────

    function test_cancel_byMerchant() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        vm.prank(MERCHANT);
        mgr.cancel(subId);

        assertFalse(mgr.getSubscription(subId).active, "should be inactive after merchant cancel");
    }

    // ─── Cancellation by customer ─────────────────────────────────────────────

    function test_cancel_byCustomer() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        vm.prank(CUSTOMER);
        mgr.cancel(subId);

        assertFalse(mgr.getSubscription(subId).active, "should be inactive after customer cancel");
    }

    // ─── Existing tests kept for regression ──────────────────────────────────

    function test_charge_succeedsAfterPeriod() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);
        mgr.charge(subId);

        vm.warp(block.timestamp + PERIOD);
        mgr.charge(subId); // must not revert
    }

    function test_cancel_preventsCharge() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        vm.prank(CUSTOMER);
        mgr.cancel(subId);

        assertFalse(mgr.getSubscription(subId).active, "should be inactive after cancel");

        vm.expectRevert(
            abi.encodeWithSelector(
                IPulseSubscriptionManager.NotSubscribed.selector, subId
            )
        );
        mgr.charge(subId);
    }

    function test_subscribe_preventsDouble() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        vm.prank(CUSTOMER);
        vm.expectRevert(
            abi.encodeWithSelector(
                IPulseSubscriptionManager.AlreadySubscribed.selector, subId
            )
        );
        mgr.subscribe(planId, 0);
    }

    function test_createPlan_zeroAmount() public {
        vm.prank(MERCHANT);
        vm.expectRevert(IPulseSubscriptionManager.InvalidAmount.selector);
        mgr.createPlan(address(usdc), 0, PERIOD, FEE_BPS);
    }

    function test_createPlan_zeroPeriod() public {
        vm.prank(MERCHANT);
        vm.expectRevert(IPulseSubscriptionManager.InvalidPeriod.selector);
        mgr.createPlan(address(usdc), AMOUNT, 0, FEE_BPS);
    }

    function test_createPlan_invalidFeeBps() public {
        vm.prank(MERCHANT);
        vm.expectRevert(IPulseSubscriptionManager.InvalidFeeBps.selector);
        mgr.createPlan(address(usdc), AMOUNT, PERIOD, 10_001);
    }

    function test_deactivatePlan_onlyMerchant() public {
        vm.prank(STRANGER);
        vm.expectRevert(
            abi.encodeWithSelector(
                IPulseSubscriptionManager.UnauthorizedMerchant.selector, planId
            )
        );
        mgr.deactivatePlan(planId);
    }

    function test_charge_revertsOnRevokedAllowance() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        vm.prank(CUSTOMER);
        usdc.approve(address(mgr), 0);

        vm.expectRevert("MockUSDC: insufficient allowance");
        mgr.charge(subId);
    }
}
