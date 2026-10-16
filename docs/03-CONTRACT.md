# 03: LumbungVault contract spec

Solidity `^0.8.24`, Arc Foundry. No upgradeability. Use OpenZeppelin `SafeERC20`, `ReentrancyGuard`, `Pausable` (install via `arc-forge install OpenZeppelin/openzeppelin-contracts`).

## Token
- `usdc` = ERC-20 interface `0x3600000000000000000000000000000000000000` (same address testnet & mainnet), **6 decimals**.
- All amounts are micro-USDC (`1 USDC = 1e6`). Never use `msg.value` / native balance.

## Roles
- `owner`: human (browser wallet). Set in constructor. Use OZ `Ownable2Step`.
- `agent`: Circle developer-controlled wallet address. Owner can rotate with `setAgent`.

## Categories
```solidity
enum Category { REWARD, CREATOR, OPS } // 0, 1, 2
struct Budget {
    uint128 perTxCap;     // micro-USDC
    uint128 dailyCap;     // micro-USDC
    uint128 spentInDay;   // micro-USDC
    uint64  dayIndex;     // block.timestamp / 1 days at last spend
}
mapping(Category => Budget) public budgets;
```
Day rollover: if `block.timestamp / 1 days != dayIndex`, reset `spentInDay = 0` and update `dayIndex` before checking. (Arc timestamps are non-decreasing; this is fine.)

Default budgets set in constructor (testnet):
| Category | perTxCap | dailyCap |
|---|---|---|
| REWARD | 5 USDC | 50 USDC |
| CREATOR | 25 USDC | 100 USDC |
| OPS | 10 USDC | 20 USDC |

## Storage
```solidity
mapping(bytes32 => bool) public usedDecision;          // exactly-once guard
struct Pending { Category cat; address to; uint128 amount; bytes32 reasonHash; uint64 createdAt; bool open; }
mapping(bytes32 => Pending) public pending;           // keyed by decisionKey
```

## Functions
```solidity
constructor(address owner_, address agent_, address usdc_)

// Agent
function pay(Category cat, address to, uint256 amount, bytes32 decisionKey, bytes32 reasonHash)
    external onlyAgent whenNotPaused nonReentrant;
  // require to != address(0); amount > 0; !usedDecision[decisionKey]
  // rollover; require amount <= perTxCap; require spentInDay + amount <= dailyCap
  // usedDecision = true; spentInDay += amount; safeTransfer(to, amount)
  // emit Paid(decisionKey, cat, to, amount, reasonHash, false)

function requestApproval(Category cat, address to, uint256 amount, bytes32 decisionKey, bytes32 reasonHash)
    external onlyAgent whenNotPaused;
  // require to != 0; amount > 0; !usedDecision[decisionKey]; !pending[decisionKey].open
  // store Pending; emit ApprovalRequested(decisionKey, cat, to, amount, reasonHash)

// Owner
function approve(bytes32 decisionKey) external onlyOwner nonReentrant;
  // require pending.open && !usedDecision; close it; usedDecision = true
  // does NOT check caps (owner override) but DOES add to spentInDay (rollover first)
  // safeTransfer; emit ApprovalResolved(decisionKey, true); emit Paid(..., true)
function reject(bytes32 decisionKey) external onlyOwner;
  // close pending; usedDecision = true; emit ApprovalResolved(decisionKey, false)
function setBudget(Category cat, uint128 perTxCap, uint128 dailyCap) external onlyOwner; // emit BudgetSet
function setAgent(address agent_) external onlyOwner;                                    // emit AgentSet
function pause() external onlyOwner; function unpause() external onlyOwner;
function withdraw(address to, uint256 amount) external onlyOwner;                        // emit Withdrawn

// Anyone
function deposit(uint256 amount, bytes32 ref) external; // safeTransferFrom(msg.sender, this, amount); emit Deposited(msg.sender, amount, ref)
// Plain USDC transfers into the vault also work (balance), they just have no Deposited event.

// Views
function balance() external view returns (uint256);                 // usdc.balanceOf(this)
function remainingToday(Category cat) external view returns (uint256); // accounts for rollover
```

## Events
```solidity
event Paid(bytes32 indexed decisionKey, Category indexed cat, address indexed to, uint256 amount, bytes32 reasonHash, bool ownerApproved);
event ApprovalRequested(bytes32 indexed decisionKey, Category indexed cat, address indexed to, uint256 amount, bytes32 reasonHash);
event ApprovalResolved(bytes32 indexed decisionKey, bool approved);
event Deposited(address indexed from, uint256 amount, bytes32 ref);
event BudgetSet(Category indexed cat, uint128 perTxCap, uint128 dailyCap);
event AgentSet(address indexed agent);
event Withdrawn(address indexed to, uint256 amount);
```

## Custom errors (cheaper + clearer for the decision log)
`NotAgent, ZeroAddress, ZeroAmount, DecisionUsed, OverPerTxCap, OverDailyCap, NotPending, AlreadyPending`.

## Required tests (`test/LumbungVault.t.sol`)
Use a mock 6-decimals ERC-20 for unit tests; one fork/integration test against Arc testnet is optional.
1. Agent pays within caps → balance moves, `Paid` emitted, `spentInDay` updated.
2. Reused `decisionKey` reverts `DecisionUsed` (also after reject).
3. Over per-tx cap reverts; over daily cap reverts; next day (warp 1 day) succeeds.
4. Non-agent cannot `pay`/`requestApproval`; non-owner cannot `approve`/`setBudget`/`withdraw`.
5. Escalation: request → approve pays even above cap; request → reject pays nothing; double approve reverts.
6. Pause blocks `pay` and `requestApproval`.
7. `to = address(0)` reverts `ZeroAddress`.

## Deploy
`script/Deploy.s.sol` reads `OWNER_ADDRESS`, `CIRCLE_AGENT_WALLET_ADDRESS`, `USDC_ADDRESS` from env, deploys, and the wrapper script writes `contracts/deployments/arc-testnet.json`. Then `scripts/fund-vault.ts` (or MetaMask) sends test USDC to the vault. Verify on `https://explorer.testnet.arc.io`.

Gas: Arc requires `maxFeePerGas ≥ 20 gwei`. Deployer EOA must hold testnet USDC (faucet.circle.com).

## Calling from Circle SDK (agent)
```ts
await circle.createContractExecutionTransaction({
  idempotencyKey: decision.id,                 // UUID v4
  walletId: env.CIRCLE_AGENT_WALLET_ID,
  contractAddress: env.LUMBUNG_VAULT_ADDRESS,
  abiFunctionSignature: "pay(uint8,address,uint256,bytes32,bytes32)",
  abiParameters: ["0", toAddress, amountMicro.toString(), decisionKey, reasonHash],
  fee: { type: "level", config: { feeLevel: "MEDIUM" } },
});
```
Same for `requestApproval(uint8,address,uint256,bytes32,bytes32)`. `decisionKey = keccak256(toBytes(decision.id))` (hex string, 32 bytes).
