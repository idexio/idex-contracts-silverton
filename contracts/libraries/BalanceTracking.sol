// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { IExchange, Structs } from './Interfaces.sol';
import { PoolTradeHelpers } from './PoolTradeHelpers.sol';

library BalanceTracking {
  using PoolTradeHelpers for Structs.PoolTrade;

  struct Balance {
    bool isMigrated;
    uint64 balanceInPips;
  }

  struct Storage {
    mapping(address => mapping(address => Balance)) balancesByWalletAssetPair;
    // Predecessor Exchange contract from which to lazily migrate balances
    IExchange migrationSource;
  }

  function updateForDeposit(
    Storage storage self,
    address wallet,
    address assetAddress,
    uint64 quantityInPips
  ) external returns (uint64 newBalanceInPips) {
    Balance storage balance =
      loadBalanceAndMigrateIfNeeded(self, wallet, assetAddress);
    balance.balanceInPips += quantityInPips;

    return balance.balanceInPips;
  }

  // Updates buyer, seller, and fee wallet balances for both assets in trade pair according to trade parameters
  function updateForTrade(
    Storage storage self,
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade,
    address feeWallet
  ) external {
    Balance storage balance;

    // Seller gives base asset including fees
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      sell.walletAddress,
      trade.baseAssetAddress
    );
    balance.balanceInPips -= trade.grossBaseQuantityInPips;
    // Buyer receives base asset minus fees
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      buy.walletAddress,
      trade.baseAssetAddress
    );
    balance.balanceInPips += trade.netBaseQuantityInPips;

    // Buyer gives quote asset including fees
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      buy.walletAddress,
      trade.quoteAssetAddress
    );
    balance.balanceInPips -= trade.grossQuoteQuantityInPips;
    // Seller receives quote asset minus fees
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      sell.walletAddress,
      trade.quoteAssetAddress
    );
    balance.balanceInPips += trade.netQuoteQuantityInPips;

    // Maker and taker fees to fee wallet
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      feeWallet,
      trade.makerFeeAssetAddress
    );
    balance.balanceInPips += trade.makerFeeQuantityInPips;
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      feeWallet,
      trade.takerFeeAssetAddress
    );
    balance.balanceInPips += trade.takerFeeQuantityInPips;
  }

  function updateForPoolTrade(
    Storage storage self,
    Structs.Order calldata order,
    Structs.PoolTrade calldata poolTrade,
    address feeWallet
  ) external {
    Balance storage balance;

    // Debit from order wallet
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      order.walletAddress,
      poolTrade.getOrderDebitAssetAddress(order.side)
    );
    balance.balanceInPips -= poolTrade.getOrderDebitQuantity(order.side);
    // Credit to order wallet
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      order.walletAddress,
      poolTrade.getOrderCreditAssetAddress(order.side)
    );
    balance.balanceInPips += poolTrade.getOrderCreditQuantity(order.side);

    // Fee wallet receives protocol fee from asset debited from order wallet
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      feeWallet,
      poolTrade.getOrderDebitAssetAddress(order.side)
    );
    balance.balanceInPips += poolTrade.takerProtocolFeeQuantityInPips;
    // Fee wallet receives gas fee from asset credited to order wallet
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      feeWallet,
      poolTrade.getOrderCreditAssetAddress(order.side)
    );
    balance.balanceInPips += poolTrade.takerGasFeeQuantityInPips;

    // Liquidity pool reserves are updated separately
  }

  function updateForWithdrawal(
    Storage storage self,
    Structs.Withdrawal memory withdrawal,
    address assetAddress,
    address feeWallet
  ) external returns (uint64 newExchangeBalanceInPips) {
    Balance storage balance;

    balance = loadBalanceAndMigrateIfNeeded(
      self,
      withdrawal.walletAddress,
      assetAddress
    );
    // Reverts if balance is overdrawn
    balance.balanceInPips -= withdrawal.quantityInPips;

    if (withdrawal.gasFeeInPips > 0) {
      balance = loadBalanceAndMigrateIfNeeded(self, feeWallet, assetAddress);

      balance.balanceInPips += withdrawal.gasFeeInPips;
    }

    return balance.balanceInPips;
  }

  function updateForLiquidityDeposit(
    Storage storage self,
    address wallet,
    address baseAssetAddress,
    address quoteAssetAddress,
    uint64 baseAssetQuantityInPips,
    uint64 quoteAssetQuantityInPips
  ) external {
    Balance storage balance;

    balance = loadBalanceAndMigrateIfNeeded(self, wallet, baseAssetAddress);
    balance.balanceInPips -= baseAssetQuantityInPips;

    balance = loadBalanceAndMigrateIfNeeded(self, wallet, quoteAssetAddress);
    balance.balanceInPips -= quoteAssetQuantityInPips;
  }

  function updateForLiquidityWithdrawal(
    Storage storage self,
    address wallet,
    address baseAssetAddress,
    address quoteAssetAddress,
    uint64 baseAssetQuantityInPips,
    uint64 quoteAssetQuantityInPips
  ) external {
    Balance storage balance;

    balance = loadBalanceAndMigrateIfNeeded(self, wallet, baseAssetAddress);
    balance.balanceInPips += baseAssetQuantityInPips;

    balance = loadBalanceAndMigrateIfNeeded(self, wallet, quoteAssetAddress);
    balance.balanceInPips += quoteAssetQuantityInPips;
  }

  function updateForExit(
    Storage storage self,
    address wallet,
    address assetAddress
  ) external returns (uint64 previousExchangeBalanceInPips) {
    Balance storage balance;

    balance = loadBalanceAndMigrateIfNeeded(self, wallet, assetAddress);
    previousExchangeBalanceInPips = balance.balanceInPips;

    require(previousExchangeBalanceInPips > 0, 'No balance for asset');

    balance.balanceInPips = 0;
  }

  function loadBalanceAndMigrateIfNeeded(
    Storage storage self,
    address wallet,
    address assetAddress
  ) private returns (Balance storage) {
    Balance storage balance =
      self.balancesByWalletAssetPair[wallet][assetAddress];

    if (!balance.isMigrated) {
      balance.balanceInPips = self.migrationSource.loadBalanceInPipsByAddress(
        wallet,
        assetAddress
      );
      balance.isMigrated = true;
    }

    return balance;
  }
}
