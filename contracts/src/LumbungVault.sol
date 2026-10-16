// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LumbungVault
 * @notice Treasury vault for Lumbung on Arc.
 * Enforces per-transaction and daily spending caps per category.
 * Moves micro-USDC (6 decimals) via an authorized Circle agent wallet or owner override.
 */
contract LumbungVault is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Category {
        REWARD,  // 0
        CREATOR, // 1
        OPS      // 2
    }

    struct Budget {
        uint128 perTxCap;   // micro-USDC
        uint128 dailyCap;   // micro-USDC
        uint128 spentInDay; // micro-USDC
        uint64 dayIndex;    // block.timestamp / 1 days at last spend
    }

    struct Pending {
        Category cat;
        address to;
        uint128 amount;
        bytes32 reasonHash;
        uint64 createdAt;
        bool open;
    }

    IERC20 public immutable usdc;
    address public agent;

    mapping(Category => Budget) public budgets;
    mapping(bytes32 => bool) public usedDecision;
    mapping(bytes32 => Pending) public pending;

    // Events
    event Paid(
        bytes32 indexed decisionKey,
        Category indexed cat,
        address indexed to,
        uint256 amount,
        bytes32 reasonHash,
        bool ownerApproved
    );
    event ApprovalRequested(
        bytes32 indexed decisionKey,
        Category indexed cat,
        address indexed to,
        uint256 amount,
        bytes32 reasonHash
    );
    event ApprovalResolved(bytes32 indexed decisionKey, bool approved);
    event Deposited(address indexed from, uint256 amount, bytes32 ref);
    event BudgetSet(Category indexed cat, uint128 perTxCap, uint128 dailyCap);
    event AgentSet(address indexed agent);
    event Withdrawn(address indexed to, uint256 amount);

    // Custom errors
    error NotAgent();
    error ZeroAddress();
    error ZeroAmount();
    error DecisionUsed();
    error OverPerTxCap();
    error OverDailyCap();
    error NotPending();
    error AlreadyPending();

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    constructor(
        address owner_,
        address agent_,
        address usdc_
    ) Ownable(owner_) {
        if (owner_ == address(0) || agent_ == address(0) || usdc_ == address(0)) {
            revert ZeroAddress();
        }

        agent = agent_;
        usdc = IERC20(usdc_);
        emit AgentSet(agent_);

        uint64 currentDay = uint64(block.timestamp / 1 days);

        // Default budgets (testnet):
        // REWARD: 5 USDC per tx, 50 USDC daily
        budgets[Category.REWARD] = Budget({
            perTxCap: 5_000_000,
            dailyCap: 50_000_000,
            spentInDay: 0,
            dayIndex: currentDay
        });
        emit BudgetSet(Category.REWARD, 5_000_000, 50_000_000);

        // CREATOR: 25 USDC per tx, 100 USDC daily
        budgets[Category.CREATOR] = Budget({
            perTxCap: 25_000_000,
            dailyCap: 100_000_000,
            spentInDay: 0,
            dayIndex: currentDay
        });
        emit BudgetSet(Category.CREATOR, 25_000_000, 100_000_000);

        // OPS: 10 USDC per tx, 20 USDC daily
        budgets[Category.OPS] = Budget({
            perTxCap: 10_000_000,
            dailyCap: 20_000_000,
            spentInDay: 0,
            dayIndex: currentDay
        });
        emit BudgetSet(Category.OPS, 10_000_000, 20_000_000);
    }

    // ==========================================
    // Internal helpers
    // ==========================================

    function _rollover(Category cat) internal returns (Budget storage b) {
        b = budgets[cat];
        uint64 currentDay = uint64(block.timestamp / 1 days);
        if (b.dayIndex != currentDay) {
            b.spentInDay = 0;
            b.dayIndex = currentDay;
        }
    }

    // ==========================================
    // Agent functions
    // ==========================================

    /**
     * @notice Execute a payout within category limits.
     * @param cat Budget category.
     * @param to Recipient address.
     * @param amount Payout amount in micro-USDC.
     * @param decisionKey Unique decision key (keccak256 hash of decision UUID).
     * @param reasonHash Hash of agent snapshot and reasoning for verification.
     */
    function pay(
        Category cat,
        address to,
        uint256 amount,
        bytes32 decisionKey,
        bytes32 reasonHash
    ) external onlyAgent whenNotPaused nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (usedDecision[decisionKey]) revert DecisionUsed();

        Budget storage b = _rollover(cat);
        if (amount > b.perTxCap) revert OverPerTxCap();
        if (uint256(b.spentInDay) + amount > b.dailyCap) revert OverDailyCap();

        usedDecision[decisionKey] = true;
        // casting to 'uint128' is safe because amount <= b.perTxCap (uint128)
        // forge-lint: disable-next-line(unsafe-typecast)
        b.spentInDay += uint128(amount);

        usdc.safeTransfer(to, amount);
        emit Paid(decisionKey, cat, to, amount, reasonHash, false);
    }

    /**
     * @notice Request owner approval for a payout exceeding caps or requiring human review.
     */
    function requestApproval(
        Category cat,
        address to,
        uint256 amount,
        bytes32 decisionKey,
        bytes32 reasonHash
    ) external onlyAgent whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > type(uint128).max) revert OverDailyCap();
        if (usedDecision[decisionKey]) revert DecisionUsed();
        if (pending[decisionKey].open) revert AlreadyPending();

        pending[decisionKey] = Pending({
            cat: cat,
            to: to,
            // casting to 'uint128' is safe because amount is checked against type(uint128).max above
            // forge-lint: disable-next-line(unsafe-typecast)
            amount: uint128(amount),
            reasonHash: reasonHash,
            createdAt: uint64(block.timestamp),
            open: true
        });

        emit ApprovalRequested(decisionKey, cat, to, amount, reasonHash);
    }

    // ==========================================
    // Owner functions
    // ==========================================

    /**
     * @notice Approve and execute a pending payment. Overrides caps but tracks daily spend.
     */
    function approve(bytes32 decisionKey) external onlyOwner nonReentrant {
        Pending storage req = pending[decisionKey];
        if (!req.open) revert NotPending();
        if (usedDecision[decisionKey]) revert DecisionUsed();

        req.open = false;
        usedDecision[decisionKey] = true;

        Budget storage b = _rollover(req.cat);
        b.spentInDay += req.amount;

        usdc.safeTransfer(req.to, req.amount);

        emit ApprovalResolved(decisionKey, true);
        emit Paid(decisionKey, req.cat, req.to, req.amount, req.reasonHash, true);
    }

    /**
     * @notice Reject a pending payout request and mark the decision key as used.
     */
    function reject(bytes32 decisionKey) external onlyOwner {
        Pending storage req = pending[decisionKey];
        if (!req.open) revert NotPending();
        if (usedDecision[decisionKey]) revert DecisionUsed();

        req.open = false;
        usedDecision[decisionKey] = true;

        emit ApprovalResolved(decisionKey, false);
    }

    /**
     * @notice Configure category spending caps.
     */
    function setBudget(
        Category cat,
        uint128 perTxCap,
        uint128 dailyCap
    ) external onlyOwner {
        Budget storage b = budgets[cat];
        b.perTxCap = perTxCap;
        b.dailyCap = dailyCap;
        emit BudgetSet(cat, perTxCap, dailyCap);
    }

    /**
     * @notice Rotate agent wallet address.
     */
    function setAgent(address agent_) external onlyOwner {
        if (agent_ == address(0)) revert ZeroAddress();
        agent = agent_;
        emit AgentSet(agent_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdrawal of vault USDC by owner.
     */
    function withdraw(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransfer(to, amount);
        emit Withdrawn(to, amount);
    }

    // ==========================================
    // Anyone
    // ==========================================

    /**
     * @notice Deposit USDC into the vault with a reference string/hash.
     */
    function deposit(uint256 amount, bytes32 ref) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount, ref);
    }

    // ==========================================
    // Views
    // ==========================================

    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function remainingToday(Category cat) external view returns (uint256) {
        Budget storage b = budgets[cat];
        uint64 currentDay = uint64(block.timestamp / 1 days);
        uint128 spent = (b.dayIndex == currentDay) ? b.spentInDay : 0;
        if (spent >= b.dailyCap) {
            return 0;
        }
        return uint256(b.dailyCap - spent);
    }
}
