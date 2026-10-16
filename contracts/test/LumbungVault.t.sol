// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LumbungVault} from "../src/LumbungVault.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract LumbungVaultTest is Test {
    LumbungVault public vault;
    MockUSDC public usdc;

    address public owner = makeAddr("owner");
    address public agent = makeAddr("agent");
    address public recipient = makeAddr("recipient");
    address public stranger = makeAddr("stranger");

    uint256 constant INITIAL_VAULT_BALANCE = 1_000_000_000; // 1,000 USDC (6 decimals)

    // Events to verify
    event Paid(
        bytes32 indexed decisionKey,
        LumbungVault.Category indexed cat,
        address indexed to,
        uint256 amount,
        bytes32 reasonHash,
        bool ownerApproved
    );
    event ApprovalRequested(
        bytes32 indexed decisionKey,
        LumbungVault.Category indexed cat,
        address indexed to,
        uint256 amount,
        bytes32 reasonHash
    );
    event ApprovalResolved(bytes32 indexed decisionKey, bool approved);
    event Deposited(address indexed from, uint256 amount, bytes32 ref);
    event BudgetSet(LumbungVault.Category indexed cat, uint128 perTxCap, uint128 dailyCap);
    event AgentSet(address indexed agent);
    event Withdrawn(address indexed to, uint256 amount);

    function setUp() public {
        usdc = new MockUSDC();
        vault = new LumbungVault(owner, agent, address(usdc));

        // Fund the vault
        usdc.mint(address(vault), INITIAL_VAULT_BALANCE);
    }

    // ================================================================
    // Test Group 1: Agent pays within caps
    // balance moves, Paid emitted, spentInDay updated
    // ================================================================

    function test_Group1_AgentPaysWithinCaps() public {
        bytes32 decisionKey = keccak256("decision-1");
        bytes32 reasonHash = keccak256("reason-1");
        uint256 amount = 3_000_000; // 3 USDC <= 5 USDC cap

        uint256 initialVaultBal = vault.balance();
        uint256 initialRecipBal = usdc.balanceOf(recipient);

        vm.expectEmit(true, true, true, true);
        emit Paid(decisionKey, LumbungVault.Category.REWARD, recipient, amount, reasonHash, false);

        vm.prank(agent);
        vault.pay(LumbungVault.Category.REWARD, recipient, amount, decisionKey, reasonHash);

        assertEq(vault.balance(), initialVaultBal - amount);
        assertEq(usdc.balanceOf(recipient), initialRecipBal + amount);

        (,, uint128 spentInDay,) = vault.budgets(LumbungVault.Category.REWARD);
        assertEq(spentInDay, amount);
        assertTrue(vault.usedDecision(decisionKey));
        assertEq(vault.remainingToday(LumbungVault.Category.REWARD), 50_000_000 - amount);
    }

    // ================================================================
    // Test Group 2: Reused decisionKey reverts DecisionUsed (also after reject)
    // ================================================================

    function test_Group2_ReusedDecisionKeyReverts() public {
        bytes32 decisionKey = keccak256("decision-2a");
        bytes32 reasonHash = keccak256("reason-2a");
        uint256 amount = 1_000_000;

        vm.prank(agent);
        vault.pay(LumbungVault.Category.REWARD, recipient, amount, decisionKey, reasonHash);

        // Reusing same decisionKey in pay must revert DecisionUsed
        vm.prank(agent);
        vm.expectRevert(LumbungVault.DecisionUsed.selector);
        vault.pay(LumbungVault.Category.REWARD, recipient, amount, decisionKey, reasonHash);

        // Reusing same decisionKey in requestApproval must also revert DecisionUsed
        vm.prank(agent);
        vm.expectRevert(LumbungVault.DecisionUsed.selector);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, amount, decisionKey, reasonHash);
    }

    function test_Group2_ReusedDecisionKeyAfterRejectReverts() public {
        bytes32 decisionKey = keccak256("decision-2b");
        bytes32 reasonHash = keccak256("reason-2b");
        uint256 amount = 10_000_000; // 10 USDC

        vm.prank(agent);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, amount, decisionKey, reasonHash);

        vm.prank(owner);
        vault.reject(decisionKey);

        assertTrue(vault.usedDecision(decisionKey));

        // Reusing same decisionKey in pay must revert DecisionUsed
        vm.prank(agent);
        vm.expectRevert(LumbungVault.DecisionUsed.selector);
        vault.pay(LumbungVault.Category.REWARD, recipient, 1_000_000, decisionKey, reasonHash);

        // Reusing same decisionKey in requestApproval must revert DecisionUsed
        vm.prank(agent);
        vm.expectRevert(LumbungVault.DecisionUsed.selector);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, amount, decisionKey, reasonHash);

        // Owner approving after reject must revert NotPending
        vm.prank(owner);
        vm.expectRevert(LumbungVault.NotPending.selector);
        vault.approve(decisionKey);
    }

    // ================================================================
    // Test Group 3: Caps enforcement and day rollover
    // Over per-tx cap reverts; over daily cap reverts; next day succeeds
    // ================================================================

    function test_Group3_OverPerTxCapReverts() public {
        bytes32 decisionKey = keccak256("decision-3-pertx");
        bytes32 reasonHash = keccak256("reason-3-pertx");

        // REWARD perTxCap = 5 USDC = 5_000_000 micro-USDC
        uint256 amount = 5_000_001;

        vm.prank(agent);
        vm.expectRevert(LumbungVault.OverPerTxCap.selector);
        vault.pay(LumbungVault.Category.REWARD, recipient, amount, decisionKey, reasonHash);
    }

    function test_Group3_OverDailyCapReverts() public {
        // REWARD dailyCap = 50 USDC = 50_000_000 micro-USDC
        // Spend 10 x 5 USDC = 50 USDC
        for (uint256 i = 0; i < 10; i++) {
            bytes32 key = keccak256(abi.encodePacked("spend-", i));
            vm.prank(agent);
            vault.pay(LumbungVault.Category.REWARD, recipient, 5_000_000, key, bytes32(0));
        }

        assertEq(vault.remainingToday(LumbungVault.Category.REWARD), 0);

        // 11th payment should revert OverDailyCap even if amount <= perTxCap
        bytes32 excessKey = keccak256("excess-daily");
        vm.prank(agent);
        vm.expectRevert(LumbungVault.OverDailyCap.selector);
        vault.pay(LumbungVault.Category.REWARD, recipient, 1_000_000, excessKey, bytes32(0));
    }

    function test_Group3_RolloverNextDaySucceeds() public {
        // Spend up to daily cap
        for (uint256 i = 0; i < 10; i++) {
            bytes32 key = keccak256(abi.encodePacked("day1-", i));
            vm.prank(agent);
            vault.pay(LumbungVault.Category.REWARD, recipient, 5_000_000, key, bytes32(0));
        }

        assertEq(vault.remainingToday(LumbungVault.Category.REWARD), 0);

        // Warp time to next day (1 day + 1 second)
        vm.warp(block.timestamp + 1 days + 1);

        // remainingToday should now reflect reset daily cap
        assertEq(vault.remainingToday(LumbungVault.Category.REWARD), 50_000_000);

        // Payment on next day should succeed
        bytes32 nextDayKey = keccak256("day2-1");
        vm.prank(agent);
        vault.pay(LumbungVault.Category.REWARD, recipient, 5_000_000, nextDayKey, bytes32(0));

        (,, uint128 spentInDay,) = vault.budgets(LumbungVault.Category.REWARD);
        assertEq(spentInDay, 5_000_000);
        assertEq(vault.remainingToday(LumbungVault.Category.REWARD), 45_000_000);
    }

    // ================================================================
    // Test Group 4: Access Control
    // Non-agent cannot pay/requestApproval; non-owner cannot approve/setBudget/withdraw
    // ================================================================

    function test_Group4_NonAgentCannotPayOrRequestApproval() public {
        bytes32 key = keccak256("unauth-key");

        // Stranger cannot pay
        vm.prank(stranger);
        vm.expectRevert(LumbungVault.NotAgent.selector);
        vault.pay(LumbungVault.Category.REWARD, recipient, 1_000_000, key, bytes32(0));

        // Owner cannot pay (only agent)
        vm.prank(owner);
        vm.expectRevert(LumbungVault.NotAgent.selector);
        vault.pay(LumbungVault.Category.REWARD, recipient, 1_000_000, key, bytes32(0));

        // Stranger cannot requestApproval
        vm.prank(stranger);
        vm.expectRevert(LumbungVault.NotAgent.selector);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, 1_000_000, key, bytes32(0));

        // Owner cannot requestApproval
        vm.prank(owner);
        vm.expectRevert(LumbungVault.NotAgent.selector);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, 1_000_000, key, bytes32(0));
    }

    function test_Group4_NonOwnerCannotApproveSetBudgetWithdraw() public {
        bytes32 key = keccak256("req-key");
        vm.prank(agent);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, 10_000_000, key, bytes32(0));

        // Stranger cannot approve
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.approve(key);

        // Stranger cannot reject
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.reject(key);

        // Stranger cannot setBudget
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.setBudget(LumbungVault.Category.REWARD, 10_000_000, 100_000_000);

        // Stranger cannot setAgent
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.setAgent(stranger);

        // Stranger cannot pause or unpause
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.pause();

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.unpause();

        // Stranger cannot withdraw
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.withdraw(stranger, 1_000_000);
    }

    // ================================================================
    // Test Group 5: Escalation
    // request -> approve pays even above cap; request -> reject pays nothing; double approve reverts
    // ================================================================

    function test_Group5_EscalationRequestAndApproveAboveCap() public {
        bytes32 decisionKey = keccak256("decision-escalate-approve");
        bytes32 reasonHash = keccak256("reason-escalate-approve");
        uint256 amount = 60_000_000; // 60 USDC > 50 USDC daily cap and > 5 USDC perTx cap

        uint256 initialVaultBal = vault.balance();
        uint256 initialRecipBal = usdc.balanceOf(recipient);

        // Agent requests approval
        vm.expectEmit(true, true, true, true);
        emit ApprovalRequested(decisionKey, LumbungVault.Category.REWARD, recipient, amount, reasonHash);

        vm.prank(agent);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, amount, decisionKey, reasonHash);

        (
            LumbungVault.Category pCat,
            address pTo,
            uint128 pAmount,
            bytes32 pReasonHash,
            uint64 pCreatedAt,
            bool pOpen
        ) = vault.pending(decisionKey);

        assertEq(uint8(pCat), uint8(LumbungVault.Category.REWARD));
        assertEq(pTo, recipient);
        assertEq(pAmount, amount);
        assertEq(pReasonHash, reasonHash);
        assertEq(pCreatedAt, uint64(block.timestamp));
        assertTrue(pOpen);

        // Cannot request again while pending
        vm.prank(agent);
        vm.expectRevert(LumbungVault.AlreadyPending.selector);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, amount, decisionKey, reasonHash);

        // Owner approves: should pay even though above perTx and daily caps
        vm.expectEmit(true, false, false, true);
        emit ApprovalResolved(decisionKey, true);

        vm.expectEmit(true, true, true, true);
        emit Paid(decisionKey, LumbungVault.Category.REWARD, recipient, amount, reasonHash, true);

        vm.prank(owner);
        vault.approve(decisionKey);

        assertEq(vault.balance(), initialVaultBal - amount);
        assertEq(usdc.balanceOf(recipient), initialRecipBal + amount);

        (,, uint128 spentInDay,) = vault.budgets(LumbungVault.Category.REWARD);
        assertEq(spentInDay, amount);
        assertTrue(vault.usedDecision(decisionKey));

        // Double approve reverts NotPending
        vm.prank(owner);
        vm.expectRevert(LumbungVault.NotPending.selector);
        vault.approve(decisionKey);
    }

    function test_Group5_EscalationRequestAndRejectPaysNothing() public {
        bytes32 decisionKey = keccak256("decision-escalate-reject");
        bytes32 reasonHash = keccak256("reason-escalate-reject");
        uint256 amount = 15_000_000;

        uint256 initialVaultBal = vault.balance();
        uint256 initialRecipBal = usdc.balanceOf(recipient);

        vm.prank(agent);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, amount, decisionKey, reasonHash);

        vm.expectEmit(true, false, false, true);
        emit ApprovalResolved(decisionKey, false);

        vm.prank(owner);
        vault.reject(decisionKey);

        assertEq(vault.balance(), initialVaultBal);
        assertEq(usdc.balanceOf(recipient), initialRecipBal);
        assertTrue(vault.usedDecision(decisionKey));

        (,,,,, bool open) = vault.pending(decisionKey);
        assertFalse(open);

        // Double reject reverts NotPending
        vm.prank(owner);
        vm.expectRevert(LumbungVault.NotPending.selector);
        vault.reject(decisionKey);

        // Approve after reject reverts NotPending
        vm.prank(owner);
        vm.expectRevert(LumbungVault.NotPending.selector);
        vault.approve(decisionKey);
    }

    // ================================================================
    // Test Group 6: Pause blocks pay and requestApproval
    // ================================================================

    function test_Group6_PauseBlocksPayAndRequestApproval() public {
        bytes32 key1 = keccak256("key-paused-pay");
        bytes32 key2 = keccak256("key-paused-request");

        vm.prank(owner);
        vault.pause();

        // pay reverts EnforcedPause
        vm.prank(agent);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.pay(LumbungVault.Category.REWARD, recipient, 1_000_000, key1, bytes32(0));

        // requestApproval reverts EnforcedPause
        vm.prank(agent);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, 1_000_000, key2, bytes32(0));

        // Unpause restores operations
        vm.prank(owner);
        vault.unpause();

        vm.prank(agent);
        vault.pay(LumbungVault.Category.REWARD, recipient, 1_000_000, key1, bytes32(0));

        vm.prank(agent);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, 1_000_000, key2, bytes32(0));
    }

    // ================================================================
    // Test Group 7: to = address(0) reverts ZeroAddress
    // ================================================================

    function test_Group7_ZeroAddressReverts() public {
        bytes32 key = keccak256("zero-addr-key");

        // pay with to = address(0)
        vm.prank(agent);
        vm.expectRevert(LumbungVault.ZeroAddress.selector);
        vault.pay(LumbungVault.Category.REWARD, address(0), 1_000_000, key, bytes32(0));

        // requestApproval with to = address(0)
        vm.prank(agent);
        vm.expectRevert(LumbungVault.ZeroAddress.selector);
        vault.requestApproval(LumbungVault.Category.REWARD, address(0), 1_000_000, key, bytes32(0));

        // withdraw with to = address(0)
        vm.prank(owner);
        vm.expectRevert(LumbungVault.ZeroAddress.selector);
        vault.withdraw(address(0), 1_000_000);

        // setAgent with address(0)
        vm.prank(owner);
        vm.expectRevert(LumbungVault.ZeroAddress.selector);
        vault.setAgent(address(0));

        // Constructor with address(0)
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new LumbungVault(address(0), agent, address(usdc));

        vm.expectRevert(LumbungVault.ZeroAddress.selector);
        new LumbungVault(owner, address(0), address(usdc));

        vm.expectRevert(LumbungVault.ZeroAddress.selector);
        new LumbungVault(owner, agent, address(0));
    }

    // ================================================================
    // Additional Edge Cases & Helper Functions
    // ================================================================

    function test_ZeroAmountReverts() public {
        bytes32 key = keccak256("zero-amount-key");

        vm.prank(agent);
        vm.expectRevert(LumbungVault.ZeroAmount.selector);
        vault.pay(LumbungVault.Category.REWARD, recipient, 0, key, bytes32(0));

        vm.prank(agent);
        vm.expectRevert(LumbungVault.ZeroAmount.selector);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, 0, key, bytes32(0));

        vm.prank(owner);
        vm.expectRevert(LumbungVault.ZeroAmount.selector);
        vault.withdraw(recipient, 0);

        vm.prank(owner);
        vm.expectRevert(LumbungVault.ZeroAmount.selector);
        // forge-lint: disable-next-line(unsafe-typecast)
        vault.deposit(0, bytes32("ref"));
    }

    function test_DepositAndWithdraw() public {
        address depositor = makeAddr("depositor");
        uint256 depositAmt = 50_000_000; // 50 USDC
        usdc.mint(depositor, depositAmt);

        vm.startPrank(depositor);
        usdc.approve(address(vault), depositAmt);
        // forge-lint: disable-next-line(unsafe-typecast)
        bytes32 ref = bytes32("seed-fund");

        vm.expectEmit(true, false, false, true);
        emit Deposited(depositor, depositAmt, ref);
        vault.deposit(depositAmt, ref);
        vm.stopPrank();

        assertEq(vault.balance(), INITIAL_VAULT_BALANCE + depositAmt);

        // Owner withdraws
        uint256 withdrawAmt = 20_000_000;
        vm.expectEmit(true, false, false, true);
        emit Withdrawn(owner, withdrawAmt);

        vm.prank(owner);
        vault.withdraw(owner, withdrawAmt);

        assertEq(vault.balance(), INITIAL_VAULT_BALANCE + depositAmt - withdrawAmt);
        assertEq(usdc.balanceOf(owner), withdrawAmt);
    }

    function test_SetBudgetAndSetAgent() public {
        address newAgent = makeAddr("newAgent");

        vm.expectEmit(true, false, false, true);
        emit AgentSet(newAgent);
        vm.prank(owner);
        vault.setAgent(newAgent);
        assertEq(vault.agent(), newAgent);

        // Old agent can no longer pay
        bytes32 key = keccak256("agent-rotated");
        vm.prank(agent);
        vm.expectRevert(LumbungVault.NotAgent.selector);
        vault.pay(LumbungVault.Category.REWARD, recipient, 1_000_000, key, bytes32(0));

        // New agent can pay
        vm.prank(newAgent);
        vault.pay(LumbungVault.Category.REWARD, recipient, 1_000_000, key, bytes32(0));

        vm.expectEmit(true, false, false, true);
        emit BudgetSet(LumbungVault.Category.CREATOR, 50_000_000, 200_000_000);
        vm.prank(owner);
        vault.setBudget(LumbungVault.Category.CREATOR, 50_000_000, 200_000_000);

        (uint128 perTx, uint128 daily,,) = vault.budgets(LumbungVault.Category.CREATOR);
        assertEq(perTx, 50_000_000);
        assertEq(daily, 200_000_000);
    }

    function test_Group3_RequestApprovalOverflow() public {
        bytes32 key = keccak256("overflow-key");
        uint256 hugeAmount = uint256(type(uint128).max) + 1;

        vm.prank(agent);
        vm.expectRevert(LumbungVault.OverDailyCap.selector);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, hugeAmount, key, bytes32(0));
    }

    function test_Group5_RemainingTodayOverDailyCap() public {
        bytes32 key = keccak256("above-daily-cap");
        uint256 amount = 70_000_000; // 70 USDC > 50 USDC daily cap

        vm.prank(agent);
        vault.requestApproval(LumbungVault.Category.REWARD, recipient, amount, key, bytes32(0));

        vm.prank(owner);
        vault.approve(key);

        // spentInDay is 70 USDC, dailyCap is 50 USDC, remainingToday should be 0
        assertEq(vault.remainingToday(LumbungVault.Category.REWARD), 0);
    }
}
