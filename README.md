<!-- markdownlint-disable MD033 -->
# <img src="assets/logo-v3.png" alt="IDEX" height="31px" valign="top" style="margin-top: 5px;"> Silverton Smart Contracts

![Tests](./assets/tests.svg)
![Lines](./assets/coverage-lines.svg)
![Branches](./assets/coverage-branches.svg)
![Functions](./assets/coverage-functions.svg)
![Statements](./assets/coverage-statements.svg)

## Overview

This repo collects source code, tests, and documentation for the primary IDEX Silverton release Solidity contracts. Supporting contracts and associated repos are part of the release as noted below.
## Install

Download and install  [nvm](https://github.com/nvm-sh/nvm#installing-and-updating),
[yarn](https://classic.yarnpkg.com/en/docs/install), and [python3](https://www.python.org/downloads/). Then:

```console
pip3 install slither-analyzer
```

## Usage

This repo is setup as a [Truffle](https://www.trufflesuite.com/docs/truffle/overview) project, with library and test
code written in Typescript. To build:

```console
nvm use
yarn && yarn build
```

It is necessary to change [solidity-coverage's](https://github.com/sc-forks/solidity-coverage) compiler settings to complete the test suite without encountering a `Stack too deep` error as documented in [Github Issues](https://github.com/sc-forks/solidity-coverage/issues/636). Modify `node_modules/solidity-coverage/plugins/truffle.plugin.js` to:

    config.compilers.solc.settings.optimizer.enabled = false;
    config.compilers.solc.settings.optimizer.details = {
      yul: true,
      yulDetails: {
        stackAllocation: true,
      },
    };

To run test suite, generate coverage report, and perform static analysis:

```console
yarn test:contracts:coverage
yarn analyze
```

## Publish

To publish a new version of this package, use the NPM CLI:

```console
npm version major | minor | patch
npm publish
```

## Background

The IDEX Silverton release builds on [Whistler](https://github.com/idexio/idex-contracts), which introduced the IDEX 2.0 platform. Silverton’s key innovation is [hybrid liquidity](https://blog.idex.io/all-posts/introducing-hybrid-liquidity) (HL), which seamlessly integrates automated market maker (AMM) liquidity pools with Whistler’s high performance central limit order book (CLOB) exchange. Silverton includes updated smart contracts along with upgrades to the IDEX off-chain infrastructure. In addition to custodying funds and settling order book trades, Silverton’s smart contracts add pool and hybrid trade settlement, pool liquidity addition and removal, and liquidity management. 

As a release, Silverton was not included in the original [IDEX 2.0 roadmap](https://github.com/idexio/idex-contracts#background). Peak2Peak and Blackcomb are still planned as future releases.

## Repos

Silverton’s smart contracts interact with a customized version of the ubiquitous, open source MasterChef yield farming contract. The yield farming components of the release are tracked in a separate repo, [idex-farm](https://github.com/idexio/idex-farm), that reflects the standard organization of most yield farming repo forks. 

The below documentation covers only the contracts in the idex-contracts-silverton repo, not idex-farm.

## Contract Structure

The Silverton on-chain infrastructure includes three main contracts and a host of supporting libraries.

- Custodian: custodies user funds with minimal additional logic.
- Governance: implements [upgrade logic](#upgradability) while enforcing [governance constraints](#controls-and-governance).
- Exchange: implements the majority of exchange functionality, including storage for wallet asset balance tracking and hybrid liquidity pool reserve tracking.

Bytecode size limits require splitting much of Exchange’s logic into external library delegatecalls. AssetRegistry, Depositing, LiquidityPoolAdmin, LiquidityPools, NonceInvalidations, Trading, and Withdrawing are structured as external libraries supporting Exchange functionality and interacting with Exchange storage.

## Trading Lifecycle

Silverton supports trading Ether and ERC-20 tokens, and requires users to deposit Ether and tokens into the Silverton smart contracts before trading. The trading lifecycle spans three steps.

### Deposit

Users must deposit funds into the Silverton contracts before they are available for trading on IDEX. Depositing ETH requires calling `depositEther` on the Exchange contract; depositing tokens requires an `approve` call on the token itself before calling `depositTokenByAddress` on the Exchange contract.

- The `depositEther` and `depositTokenByAddress` are functions on the Exchange contract, but the funds are ultimately held in the Custodian contract. As part of the deposit process, tokens are transferred from the funding wallet to the Custodian contract while the Exchange contract’s storage tracks wallet asset balances. Separate exchange logic and fund custody supports IDEX 2.0’s [upgrade design](#upgradability).
- Deposits are only allowed for [registered tokens](#token-symbol-registry).
- Deposit amounts are adjusted to IDEX 2.0’s [normalized precision design](#precision-and-pips) to prevent depositing any dust.
- Deposits from [exited wallets](#wallet-exits) are rejected.

### Trade

With hybrid liquidity, Silverton implements three types of trades.

1. Order book trade: A trade settled between two order book orders with matching terms. This is the traditional type of trade supported by central limit order book exchanges. Order book trades are settled by Exchange’s `executeOrderBookTrade` function.
1. Pool trade: A trade involving an AMM pool and a single taker order. This is similar to a “swap” in standard AMM pools. The taking order adds one reserve to the pool and receives the other reserve in accordance with the terms of the order and constant product formula. Pool trades are settled by Exchange’s `executePoolTrade` function.
1. Hybrid trade: A trade involving an AMM pool and two order book orders. In hybrid trades, the pool and one order supply liquidity and one order takes liquidity. Conceptually, the pool fills in liquidity between standing maker orders on the order book. Hybrid trades are settled by Exchange’s `executeHybridTrade` function.

In Silverton, all order management and trade matching happens off-chain while trades are ultimately settled on-chain. A trade is considered settled when the Exchange contract’s wallet asset and pool balances reflect the new values agreed to in the trade.

- Unlike deposits, trade settlement can only be initiated via a whitelisted Dispatch wallet controlled by IDEX. Users do not settle trades directly; only IDEX can submit trades for settlement. Because IDEX alone controls dispatch, IDEX’s off-chain components can guarantee the eventual on-chain trade settlement order and thus allow users to trade in real-time without waiting for dispatch or mining.
- The primary responsibility of the trade functions is order and trade validation. In the case that IDEX off-chain infrastructure is compromised, the validations ensure that funds can only move in accordance with orders signed by the depositing wallet.
- Due to business requirements, orders are specified by symbol, eg “UBT-ETH” rather than by token contract addresses. A number of validations result from the [token symbol registration system](#token-symbol-registry). Note the `trade` parameters to the various `execute` functions include the symbol strings separately. This is a gas optimization to order signature verification as string concat is cheaper than split.
- Due to business requirements, order quantity and price are specified as strings in [PIP precision](#precision-and-pips), hence the need for order signature validation to convert the provided values to strings.
- IDEX 2.0 supports partial fills on orders, which requires additional bookkeeping to prevent overfills and replays.
- AMM pools only supply liquidity to a market; pools are always makers, never takers.
All trade types enforce the user-specified terms of the orders as well as the constant product formula and invariant of the AMM pool.
- The price of an AMM pool may not cross a standing maker order price. In the case of hybrid settlements, the pool price after the settlement may not exceed the limit price of the making order book order.
- Fees are assessed as part of trade settlement. The off-chain trading engine computes fees, but the trade functions are responsible for enforcing that fees are within [previously defined limits](#controls-and-governance). Business rules require that makers and takers are charged different fees.
- For order book trades, fees are deducted from the quantity of asset each party is receiving.
- Pool trades involve three primary fees.
    - Protocol fee: This is equivalent to the IDEX trade fee for order book trades. It is deducted from the quantity of asset that the taking order is sending. It does not contribute to pool liquidity.
    - Pool fee: Similar to standard AMM pool fees, the pool fee is deducted from the quantity of asset that the taking order is sending – ie, the reserve that the pool is receiving – and contributes to pool liquidity.
    - Gas fee: Covers the gas costs of trade settlement. Because only an IDEX-controlled Dispatch wallet can make the settlement calls, IDEX is the immediate gas payer for trade settlement. IDEX passes along the estimated gas costs to users by collecting a fee from the quantity of asset received by the taking wallet.
    - Under certain extreme pricing circumstances, a small taker price correction fee is also applied to pool settlement to ensure that the resulting pool price meets its target within the bounds of pip precision.
- Hybrid trades are settled with a single gas fee rather than individual gas fees for order book and pool components.

### Withdraw

Similar to trade settlement, withdrawals are initiated by users via IDEX’s off-chain components, but calls to the Exchange contract’s `withdraw` function are restricted to the whitelisted Dispatch wallet. `withdraw` calls are limited to the Dispatch wallet in order to guarantee the balance update sequence and thus support trading ahead of settlement. There is also a [wallet exit](#wallet-exits) mechanism to prevent withdrawal censorship by IDEX.

- Withdrawals may be requested by asset symbol or by token contract address. Withdrawal by asset symbol is the standard approach as dictated by business rules and requires a lookup of the token contract address in the [token symbol registry](#token-symbol-registry). Withdrawal by token contract asset exists to cover the case where an asset has been relisted under the same symbol, for example in the case of a token swap.
- IDEX collects fees on withdrawals in order to cover the gas costs of the `withdraw` function call. Because only an IDEX-controlled Dispatch wallet can make the `withdraw` call, IDEX is the immediate gas payer for user withdrawals. IDEX passes along the estimated gas costs to users by collecting a fee out of the withdrawn amount.
- Despite the `withdraw` function being part of the Exchange contract, funds are returned to the user’s wallet from the Custodian contract.

## Liquidity Management

IDEX Silverton’s hybrid liquidity pools may be launched with no initial liquidity or may be launched with liquidity migrated from the [IDEXFarm](https://github.com/idexio/idex-farm) contract. In the case of launching a new pool with no initial liquidity, an admin calls Exchange’s `createLiquidityPool` function directly. When migrating liquidity from the IDEXFarm contract – sometimes called a “vampire attack” – an admin calls IDEXFarm’s migrate function, which subsequently calls Exchange’s `migrateLiquidityPool` function. Migrations liquidate the LP tokens held in the IDEXFarm contract, transfer the underlying reserves to Exchange, and issue new, equivalent LP tokens back to the IDEXFarm holdings. Multiple migrations to the same hybrid liquidity pool are supported. Business considerations determine which approach is employed on a pool-by-pool basis.

### Constraints

Due to requirements of the broader system, hybrid liquidity pools are subject to reserve quantity constraints beyond the constant product invariant.

- Trading against a hybrid liquidity pool is not available when either reserve quantity is below 1.
- The ratio between reserve quantities may not exceed 1:100,000,000.
- The [pip-precision](#precision-and-pips) ratio between reserve quantities – ie the pool’s price – may not change due to liquidity additions or removals.

These constraints are enforced in liquidity addition and trade settlement as necessary.

### LP Tokens

Creating or migrating a new hybrid liquidity pool deploys a new ERC-20 contract representing Liquidity Provider ownership. Similar to the Uniswap Pair LP token, the LiquidityProviderToken is a simple and standard token contract that allows hybrid liquidity pool ownership to be integrated elsewhere in the DeFi ecosystem. New additions to a hybrid liquidity pool mint new LiquidityProviderTokens representing ownership shares, and burning LiquidityProviderTokens redeems pool ownership shares for the underlying reserve tokens.

- LP token contracts employ a stable, programmatically generated contract address based on the underlying reserve token contract addresses.
- LP tokens are automatically added to the [token symbol registry](#token-symbol-registry) on creation with a programmatically generated symbol.
- The LP token `name` function programmatically generates a token name based on the underlying reserve tokens and represented market; `symbol` is a fixed value for all tokens.
- The LP token ABI does not match the Uniswap V2 Pair ABI, but it does contain `token0` and `token1` accessors for broader ecosystem compatibility. 
- LP tokens support [liquidity pool reversals](#liquidity-pool-reversals).

### Liquidity Addition

Silverton provides two options for users to add liquidity to hybrid liquidity pools.

#### Deposit Additions

Deposit additions draw funds from a wallet’s Exchange-tracked balances to add to a liquidity pool’s reserves. 

- Similar to trade settlement, deposit additions are initiated and processed off-chain and settled on chain via Exchange’s `executeAddLiquidity` function. Only a whitelisted Dispatch wallet can initiate liquidity addition settlement.
- The primary responsibility of `executeAddLiquidity` is request validation and balance updates. Funds can only move in accordance with requests signed by the depositing wallet.
- The LP tokens resulting from a liquidity addition may be sent to any address. As a convenience, LP tokens sent to the Custodian contract address are credited to the wallet’s Exchange-tracked balance.
- Because only an IDEX-controlled Dispatch wallet can make the settlement calls, IDEX is the immediate gas payer for liquidity addition settlement. IDEX passes along the estimated gas costs to users by collecting a fee from each added reserve asset proportional to the pool reserve ratio.

#### Wallet Additions

Wallet additions use a multi-step process to draw funds directly from wallet balances to add to a hybrid liquidity pool’s reserves.

- Wallet additions are initiated by a call to Exchange’s `addLiquidity` or `addLiqudityETH` functions. Both functions implement the same parameters as the corresponding functions in [UniswapV2 Periphery’s Router](https://github.com/Uniswap/uniswap-v2-periphery/blob/dda62473e2da448bc9cb8f4514dadda4aeede5f4/contracts/UniswapV2Router02.sol). Tokens must be approved before calling the wallet addition functions.
- `addLiquidity` and `addLiqudityETH` operate similarly to the corresponding Router functions but differ in some important ways. Most importantly, these functions do not add reserve tokens to the pool and return LP tokens in a single transaction. Further steps are taken by IDEX’s off-chain components, with settlement occurring in a subsequent and independent transaction.
- Ether is not wrapped as WETH as part of the Wallet Addition process.

Wallet additions proceed in several steps:

1. A wallet call to `addLiquidity` or `addLiqudityETH` initiates the process.
1. The wallet addition functions include baseline validations, such as for the `deadline` parameter, and thus may revert.
1. Provided the wallet addition function succeeds, the maximum specified amounts of both reserve tokens are deposited into Exchange-tracked balances. No further action is taken within the transaction.
1. IDEX’s off-chain components then process the deposit and, using the wallet addition function parameters, attempt to execute the liquidity addition.
    1. If the liquidity addition validation fails off-chain, no further steps are taken, and the reserve token funds are left as Exchange-tracked balances.
    1. If the liquidity addition succeeds off-chain, settlement takes place using the [Deposit Addition](#deposit-additions) approach.

### Liquidity Removal

Silverton provides two options for users to remove liquidity from hybrid liquidity pools, Deposit Removals via Exchange’s `executeRemoveLiquidity` and Wallet Removals via Exchange’s `removeLiquidity` and `removeLiquidityETH`. Structurally, both approaches work similarly to [Deposit Additions](#deposit-additions) and [Wallet Additions](#wallet-additions). There is also a provision in the [wallet exit](#wallet-exits) mechanism to prevent liquidity removal censorship by IDEX.

- Liquidity removals (and additions) use slightly different logic in calculating the reserves represented by LP tokens than many AMM pair designs. As part of the larger hybrid liquidity design, liquidity pools must maintain constant [pip-precision](#precision-and-pips) pricing during a removal. As such, the base quantity is computed from the liquidity to total liquidity ratio, and the quote is computed from the removed base and pool’s price.

### Liquidity Pool Reversals

Unlike many AMM pair designs, hybrid liquidity pools explicitly identify reserve assets as base and quote. Business rules require the ability to switch the base and quote assets of an existing liquidity pool. Liquidity pool reversals are initiated by the admin, and business process rules prevent race conditions with trade settlement and other actions. Reserve quantities of each asset are unchanged by a reversal.

## Upgradability

IDEX’s Whistler release introduced an [upgrade model](https://github.com/idexio/idex-contracts#upgradability) that allows contract logic upgrades without requiring users to move or redeposit funds. Silverton is the first release to take advantage of these upgrade mechanisms and introduces several new capabilities. 

- In Silverton, Exchange state data continues to be stored in the Exchange contract rather than an external contract. Wallet balance information, captured in `_balanceTracking`, is the primary data that must migrate in the case of an upgrade. Silverton introduces a lazy balance loading mechanism in the form of BalanceTracking’s `loadBalanceAndMigrateIfNeeded` to seamlessly maintain balance information at a minimum of gas overhead.
- For future releases, Exchange also includes `cleanupWalletBalance`, which enables the removal of old wallet balance state in the interest of state conservation and gas savings.
- Constant’s `signatureHashVersion` is incremented as part of the upgrade. As a result, existing Whistler orders are not compatible with Silverton, and it is unnecessary to migrate `_completedOrderHashes`, `_partiallyFilledOrderQuantitiesInPips`, and `_nonceInvalidations`. `_walletExits` and `_completedWithdrawalHashes` are also unnecessary to migrate as users may exit wallets again, and replayed withdrawals pose little practical risk.
- `_depositIndex` and `_assetRegistry` entries are manually set on deployment rather than migrated from Whistler.

Silverton also supports deployment in the absence of a Whistler Exchange upgrade, for example on a new blockchain where no Whistler Exchange is active.

## Controls and Governance

The Whistler controls and governance design is captured in its own [spec](https://github.com/idexio/idex-contracts-silverton/blob/main/GOVERNANCE.md). Silverton does not add any new control mechanics, however, the existing controls apply to its Liquidity Management.

## Additional Mechanics

### Token Symbol Registry

Business rules require orders to be specified in asset symbol terms rather than token contract address terms. For example, an order specifies the market as `"UBT-ETH"` rather than `{ "base": "0xb705268213d593b8fd88d3fdeff93aff5cbdcfae", "quote": "0x0" }`. Deposits, withdrawals and asset balance tracking, however, must be implemented in token contract address terms. In order to support both usage modes, Whistler includes a token registry that maps symbols to token contract addresses along with additional token metadata, such as precision. Only registered tokens are accepted for deposit.

- Token registration is a two-transaction process, requiring separate calls to `registerToken` and `confirmTokenRegistration`. Two steps reduce the likelihood of data entry errors when registering a new token.
- Occasionally projects upgrade their token address via a token swap but need to retain the same trading symbol. To support this use case, the token registration mechanism can track multiple token contract addresses for a symbol. The registry includes registration time stamps to ensure orders and withdrawals are only executed against the intended token contract address, as validated against the order or withdrawal nonce. Off-chain business process rules ensure orders are not accepted during new token registration of the same symbol to prevent race conditions.

### Precision and Pips

In its off-chain components, IDEX 2.0 normalizes all assets to a maximum of 8 decimals of precision, with 1e-8 referred to as a "pip". Because deposit and withdrawals must account for the true token precision, however, the token registry includes token decimals as well as functions to convert `pipsToAssetUnits` and `assetUnitsToPips`. All wallet asset balances are tracked in pips.

### Nonces and Invalidation

Orders include nonces to prevent replay attacks. IDEX uses [version-1 UUIDs](https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_1_(date-time_and_MAC_address)) as nonces, which include a timestamp as part of the value.

IDEX’s hybrid off-chain/on-chain architecture is vulnerable to a cancelled-order submission attack if the off-chain components are compromised. In this scenario, an attacker gains access to the Dispatch wallet and a set of cancelled orders by compromising the off-chain order book. Because the orders themselves include valid signatures from the placing wallet, the Whistler contract cannot distinguish between active orders placed by users and those the user has since cancelled.

Nonce invalidation via invalidateOrderNonce allows users to invalidate all orders prior to a specified nonce, making it impossible to submit those orders in a subsequent cancelled-order submission attack. The [controls and governance](#controls-and-governance) spec covers the exact mechanics and parameters of the mechanism.

### Wallet Exits

Whistler introduced a wallet exit mechanism, which allows users to withdraw funds in the case that IDEX is offline or maliciously censoring withdrawals. Calling `exitWallet` initiates the exit process, which prevents the wallet from subsequent liquidity additions, liquidity removals, deposits, trades, or normal withdrawals. Wallet exits are a two-step process as defined in [controls](#controls-and-governance).

Silverton expands wallet exits to cover hybrid pool liquidity removals. When functioning normally, the off-chain components automatically liquidate all of a wallet’s exchange-held LP tokens on exit initiation. Once an exit is finalized, wallets may also manually call `removeLiquidityExit` to burn their Exchange-tracked LP token balance and redeem the underlying reserve tokens.

### Multi-Chain Support

Silverton consolidates Whistler’s multi-chain support for EVM-compatible blockchains by consolidating key values in Constants, and allowing parameterization of other values such as the WETH or native asset wrapping ERC-20 contract address.

## License

The IDEX Silverton Smart Contracts and related code are released under the [GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.en.html).
