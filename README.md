<!-- markdownlint-disable MD033 -->
# <img src="assets/logo.png" alt="IDEX" height="36px" valign="top"> project9 Smart Contracts

## Overview

This repo collects source code, tests, and documentation for the IDEX Silverton release Ethereum contracts.

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

To run test suite, generate coverage report, and perform static analysis:

```console
yarn coverage
yarn analyze
```

## Publish

To publish a new version of this package, use the NPM CLI:

```console
npm version major | minor | patch
npm publish
```

## Background

IDEX is in development on a series of major product releases that together comprise IDEX 2.0.

- Release 1 (Whistler): The Whistler release contains all of the off-chain upgrades of IDEX 2.0, including new web and
mobile UIs, new REST and WS APIs, and a high-performance in-memory trading engine that supports advanced order types.
Whistler also includes new smart contracts that custody funds and settle trades on-chain. Unlike later releases, the
Whistler smart contracts are structurally similar to the [IDEX 1.0 contract](https://etherscan.io/address/0x2a0c0dbecc7e4d658f48e01e3fa353f44050c208#code
) design in that each trade results in a single layer-1 transaction to update the on-contract balances.
  
- Release 2 (Peak2Peak): An original layer-2 scaling solution, known as Optimized Optimistic Rollup (O2R), is part of
the larger IDEX 2.0 initiative. Unlike the Whistler contracts, the O2R contracts roll individual trades up into
periodic Merkle root state summaries that are published to layer 1. The Peak2Peak release launches the O2R smart
contracts and accompanying infrastructure to run in parallel with the Whistler smart contracts. During P2P, the Whistler
contracts continue to settle trades and maintain the canonical wallet balances. Running the O2R contracts in parallel
allows testing on real workloads and tuning system parameters prior to switching to O2R exclusively.
  
- Release 3 (Blackcomb): The Blackcomb release switches settlement and balance tracking from the Whistler contracts to
the O2R layer-2 system.

## Contract Structure

The Whistler on-chain infrastructure includes three main contracts and a host of supporting libraries.

- Custodian: custodies user funds with minimal additional logic.
- Governance: implements [upgrade logic](#upgradability) while enforcing [governance constraints](#controls-and-governance).
- Exchange: implements the majority of exchange functionality, including wallet asset balance tracking.

## Additional Mechanics

### Token Symbol Registry

Business rules require orders to be specified in asset symbol terms rather than token contract address terms. For
example, an order specifies the market as `"UBT-ETH"` rather than `{ "base": "0xb705268213d593b8fd88d3fdeff93aff5cbdcfae",
"quote": "0x0" }`. Deposits, withdrawals and asset balance tracking, however, must be implemented in token contract
address terms. In order to support both usage modes, Whistler includes a token registry that maps symbols to token contract
addresses along with additional token metadata, such as precision. Only registered tokens are accepted for deposit.

- Token registration is a two-transaction process, requiring separate calls to `registerToken` and `confirmTokenRegistration`.
Two steps reduce the likelihood of data entry errors when registering a new token.
  
- Occasionally projects upgrade their token address via a token swap but need to retain the same trading symbol. To
support this use case, the token registration mechanism can track multiple token contract addresses for a symbol. The
registry includes registration time stamps to ensure orders and withdrawals are only executed against the intended
token contract address, as validated against the order or withdrawal [nonce](#nonces-and-invalidation). Off-chain
business process rules ensure orders are not accepted during new token registration of the same symbol to prevent race
conditions.
  
### Precision and Pips

In its off-chain components, IDEX 2.0 normalizes all assets to a maximum of 8 decimals of precision, with 1e-8 referred
to as a "pip". Because deposit and withdrawals must account for the true token precision, however, the token registry
includes token decimals as well as functions to convert `pipsToAssetUnits` and `assetUnitsToPips`. All wallet asset
balances are tracked in pips.

### Nonces and Invalidation

Orders include nonces to prevent replay attacks. IDEX 2.0 uses [version-1 UUIDs](https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_1_(date-time_and_MAC_address))
as nonces, which include a timestamp as part of the value.

IDEX’s hybrid off-chain/on-chain architecture is vulnerable to a cancelled-order submission attack if the off-chain
components are compromised. In this scenario, an attacker gains access to the Dispatch wallet and a set of cancelled
orders by compromising the off-chain order book. Because the orders themselves include valid signatures from the
placing wallet, the Whistler contract cannot distinguish between active orders placed by users and those the user has
since cancelled.

Nonce invalidation via `invalidateOrderNonce` allows users to invalidate all orders prior to a specified nonce, making it
impossible to submit those orders in a subsequent cancelled-order submission attack. The
[controls and governance](#controls-and-governance) spec covers the exact mechanics and parameters of the mechanism.
