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

    uint256 internal constant AMOUNT  = 10e6;    // 10 USDC
    uint256 internal constant PERIOD  = 30 days;
    uint16  internal constant FEE_BPS = 100;      // 1 %

    bytes32 internal planId;
    bytes32 internal subId;

    function setUp() public {
        vm.startPrank(OWNER);
        usdc = new MockUSDC();
        mgr  = new PulseSubscriptionManager(FEE_RECIP);
        vm.stopPrank();

        // Merchant creates a plan
        vm.prank(MERCHANT);
        planId = mgr.createPlan(address(usdc), AMOUNT, PERIOD, AMOUNT, FEE_BPS);

        // Compute expected subscriptionId
        subId = keccak256(abi.encodePacked(planId, CUSTOMER));

        // Fund and approve customer
        usdc.mint(CUSTOMER, 1000e6);
        vm.prank(CUSTOMER);
        usdc.approve(address(mgr), type(uint256).max);
    }

    // ─── Happy-path ───────────────────────────────────────────────────────────

    function test_createPlan_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit IPulseSubscriptionManager.PlanCreated(
            // planId will be the next one
            keccak256(abi.encodePacked(MERCHANT, uint256(2))),
            MERCHANT,
            address(usdc),
            AMOUNT,
            PERIOD,
            AMOUNT,
            FEE_BPS
        );
        vm.prank(MERCHANT);
        mgr.createPlan(address(usdc), AMOUNT, PERIOD, AMOUNT, FEE_BPS);
    }

    function test_subscribe_setsState() public {
        vm.prank(CUSTOMER);
        bytes32 returnedId = mgr.subscribe(planId, 0);

        assertEq(returnedId, subId, "subscriptionId mismatch");

        IPulseSubscriptionManager.Subscription memory sub = mgr.getSubscription(subId);
        assertEq(sub.planId,       planId);
        assertEq(sub.customer,     CUSTOMER);
        assertEq(sub.totalSpent,   0);
        assertEq(sub.totalSpendCap, 0);
        assertTrue(sub.active);
    }

    function test_charge_happyPath_balanceDeltas() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        uint256 merchantBefore  = usdc.balanceOf(MERCHANT);
        uint256 feeBefore       = usdc.balanceOf(FEE_RECIP);
        uint256 customerBefore  = usdc.balanceOf(CUSTOMER);

        mgr.charge(subId);

        uint256 fee            = (AMOUNT * FEE_BPS) / 10_000; // 0.1 USDC
        uint256 merchantAmount = AMOUNT - fee;

        assertEq(usdc.balanceOf(MERCHANT),   merchantBefore  + merchantAmount, "merchant delta");
        assertEq(usdc.balanceOf(FEE_RECIP),  feeBefore       + fee,            "fee delta");
        assertEq(usdc.balanceOf(CUSTOMER),   customerBefore  - AMOUNT,         "customer delta");
    }

    function test_charge_updatesNextChargeAt() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        uint256 ts = block.timestamp;
        mgr.charge(subId);

        IPulseSubscriptionManager.Subscription memory sub = mgr.getSubscription(subId);
        assertEq(sub.nextChargeAt, ts + PERIOD, "nextChargeAt should be now + period");
        assertEq(sub.totalSpent,   AMOUNT,       "totalSpent should equal amount");
    }

    // ─── Period enforcement ───────────────────────────────────────────────────

    function test_charge_revertsIfTooEarly() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);
        mgr.charge(subId); // first charge succeeds

        // Second immediate charge must revert
        vm.expectRevert(
            abi.encodeWithSelector(
                IPulseSubscriptionManager.TooEarlyToCharge.selector,
                subId,
                block.timestamp + PERIOD
            )
        );
        mgr.charge(subId);
    }

    function test_charge_succeedsAfterPeriod() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);
        mgr.charge(subId);

        vm.warp(block.timestamp + PERIOD);
        mgr.charge(subId); // must not revert
    }

    // ─── Spend cap enforcement ────────────────────────────────────────────────

    function test_charge_revertsWhenCapExceeded() public {
        // Cap: exactly one charge worth
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, AMOUNT);
        mgr.charge(subId); // uses up entire cap

        vm.warp(block.timestamp + PERIOD);

        vm.expectRevert(
            abi.encodeWithSelector(
                IPulseSubscriptionManager.SpendCapExceeded.selector, subId
            )
        );
        mgr.charge(subId);
    }

    function test_charge_unlimitedCap() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0); // 0 = unlimited

        for (uint i = 0; i < 3; i++) {
            vm.warp(block.timestamp + PERIOD);
            mgr.charge(subId); // should never revert on cap
        }
    }

    // ─── Cancellation ────────────────────────────────────────────────────────

    function test_cancel_preventsCharge() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        vm.prank(CUSTOMER);
        mgr.cancel(subId);

        IPulseSubscriptionManager.Subscription memory sub = mgr.getSubscription(subId);
        assertFalse(sub.active, "should be inactive after cancel");

        vm.expectRevert(
            abi.encodeWithSelector(
                IPulseSubscriptionManager.NotSubscribed.selector, subId
            )
        );
        mgr.charge(subId);
    }

    function test_cancel_onlySubscriber() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        vm.prank(STRANGER);
        vm.expectRevert(
            abi.encodeWithSelector(
                IPulseSubscriptionManager.NotSubscribed.selector, subId
            )
        );
        mgr.cancel(subId);
    }

    // ─── Allowance revocation ─────────────────────────────────────────────────

    function test_charge_revertsOnRevokedAllowance() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        // Customer revokes allowance
        vm.prank(CUSTOMER);
        usdc.approve(address(mgr), 0);

        vm.expectRevert("MockUSDC: insufficient allowance");
        mgr.charge(subId);
    }

    // ─── Plan deactivation ────────────────────────────────────────────────────

    function test_deactivatePlan_preventsCharge() public {
        vm.prank(CUSTOMER);
        mgr.subscribe(planId, 0);

        vm.prank(MERCHANT);
        mgr.deactivatePlan(planId);

        vm.expectRevert(
            abi.encodeWithSelector(
                IPulseSubscriptionManager.PlanNotActive.selector, planId
            )
        );
        mgr.charge(subId);
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

    // ─── Authorization / double-subscribe prevention ──────────────────────────

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

    // ─── Input validation ─────────────────────────────────────────────────────

    function test_createPlan_zeroAmount() public {
        vm.prank(MERCHANT);
        vm.expectRevert(IPulseSubscriptionManager.InvalidAmount.selector);
        mgr.createPlan(address(usdc), 0, PERIOD, 0, FEE_BPS);
    }

    function test_createPlan_zeroPeriod() public {
        vm.prank(MERCHANT);
        vm.expectRevert(IPulseSubscriptionManager.InvalidPeriod.selector);
        mgr.createPlan(address(usdc), AMOUNT, 0, AMOUNT, FEE_BPS);
    }

    function test_createPlan_invalidFeeBps() public {
        vm.prank(MERCHANT);
        vm.expectRevert(IPulseSubscriptionManager.InvalidFeeBps.selector);
        mgr.createPlan(address(usdc), AMOUNT, PERIOD, AMOUNT, 10_001);
    }
}
