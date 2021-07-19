# Controls and Governance

## Overview

Silverton on-chain components span several contracts, each with attendant controls and governance. Silverton's primary contracts
also interact with a secondary set of contracts tracked in the [IDEX Farm](https://github.com/idexio/idex-farm) repo.

## Custodian Contract

The Custodian contract custodies user funds with minimal additional logic. Specifically, it tracks two control contract addresses:

- Exchange: the Exchange contract address is the only agent whitelisted to authorize transfers of funds out of the Custodian.
- Governance: the Governance contract address is the only agent whitelisted to authorize changing the Exchange and
Governance contract addresses within the Custodian.
  
The Custodian has no control logic itself beyond the above authorizations. Its logic is limited by design to maximize
future upgradability without requiring fund migration.

## Governance Contract

The Governance contract implements the contract upgrade logic while enforcing governance constraints.

- The Governance contract has a single owner, and the owner cannot be changed.
- The Governance contract has a single admin, and the admin can be changed with no delay by the owner.
- The admin is the only agent whitelisted to change the Custodian’s Exchange or Governance contract addresses, but the
change is a two-step process.
  - The admin first calls an upgrade authorization with the new contract address, which initiates the Contract Upgrade
Period.
  - Once the Contract Upgrade Period expires, the admin can make a second call that completes the change to the new
contract address.
- At any time during the Contract Upgrade Period, the admin can cancel the upgrade immediately.

### Fixed Parameter Settings

These settings have been pre-determined and may be hard-coded or implicit in the contract logic.

- Admin Change Period: immediate
- Contract Upgrade Period: 1 week
- Contract Upgrade Cancellation Period: immediate
  
## Exchange Contract

The Exchange contract implements the majority of exchange functionality, including wallet asset balance tracking. As
such, it contains several fine-grained control and protection mechanisms:

- The Exchange contract has a single owner, and the owner cannot be changed.
- The Exchange contract has a single admin, and the admin can be changed with no delay by the owner.
- The admin can add or remove addresses as Dispatch wallets with no delay. Dispatch wallets are authorized to call
operator-only contract functions: `executeOrderBookTrade`, `executePoolTrade`, `executeHybridTrade`, `withdraw`, `executeAddLiquidity`, and 
`executeRemoveLiquidity`.
- The admin can change the Liquidity Migrator contract address with no delay. The Liquidity Migrator contract is the only
address authorized to call `migrateLiquidityPool`.
- The Exchange contract tracks a single fee wallet address, and the fee wallet can be changed with no delay by the admin.
- Nonce invalidation is user-initiated rather than operator-initiated.
  - User calls a function on Exchange with a nonce before which all orders should be invalidated.
  - The Exchange records the invalidation, and starts enforcing it in the trade function after the Chain Propagation Period.
  - Off-chain, on detecting the nonce invalidation transaction, all open orders prior to the target nonce for the wallet
are canceled.
- Wallet exits are user-initiated, and 1) prevent the target wallet from deposits, trading, normal withdrawals, and normal liquidity
additions and removals and 2) subsequently allow the user to directly withdraw any balances and remove pool liquidity.
  - User calls the `exitWallet` function on the Exchange.
  - The Exchange records the exit and block number, immediately blocks deposits and liquidity addition and removal initiation, 
  and starts the Chain Propagation Period.
  - Once the Chain Propagation Period expires:
    - The Exchange Contract blocks any trades, normal withdrawals, and liquidity addition and removal executions for the wallet.
    - The Exchange Contract allows the user to remove hybrid pool liquidity represented by LP tokens held in exchange balances.
    - The Exchange Contract allows the user to initiate exit withdrawal transactions for any wallet balances remaining on the Exchange.
  - Off-chain, on detecting the wallet exit transaction:
    - All core actions are disabled for the wallet.
    - The wallet is marked as exited, which prevents re-enabling any of the core actions.
    - All open orders are canceled for the wallet.
    - All LP tokens held by the wallet in exchange balances are liquidated for reserve tokens.
  - An exited wallet can be reinstated for trading by calling the `clearWalletExit` function on the Exchange.
- The admin can change the Chain Propagation Period with no delay, subject to the Minimum Chain Propagation Period and
Maximum Chain Propagation Period limits.
- Fee maximums are enforced by the Exchange and specified by a Maximum Fee Rate. The Maximum Fee Rate is defined as a percentage
ans is not changeable.

### Fixed Parameter Settings

These settings have been pre-determined and may be hard-coded or implicit in the contract logic.

- Admin Change Period: immediate
- Dispatch Change Period: immediate
- Fee Change Period: immediate
- Minimum Chain Propagation Period: 0
- Maximum Chain Propagation Period: 1 week
- Chain Propagation Change Period: immediate
- Maximum Fee Rate: 20%

### Changable Parameters

These settings have the initial values below but are be changeable in the contract according to the above specs.

- Chain Propagation Period: 1 hour

## IDEX Farm

The [IDEX Farm](https://github.com/idexio/idex-farm) contract uses the standard OpenZeppelin Ownable implementation for governance and controls.

- The Farm has a single owner, and the owner may be changed or renounced by the owner with no delay.
- The owner is the only address authorized to call Farm's `add`, `set`, `setMigrator`, `migrate`, `setRewardPerBlock`, and
`withdrawRewardToken`.
- The Migrator is initialized with a whitelisted Farm address, and the Farm address cannot be changed. The
whitelisted Farm address is the only address that can call `migrate`.
- The Migrator is initialized with a block before which migration is not possible.