// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import {
  IPair
} from '@idexio/pancake-swap-core/contracts/interfaces/IPair.sol';

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { IExchange, Structs } from './Interfaces.sol';
import { PoolTradeHelpers } from './PoolTradeHelpers.sol';

library BalanceTracking {
  using AssetRegistry for AssetRegistry.Storage;
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
  ) internal returns (uint64 newBalanceInPips) {
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
  ) internal {
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
    Structs.Order memory order,
    Structs.PoolTrade memory poolTrade,
    address feeWallet
  ) internal {
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
  ) internal returns (uint64 newExchangeBalanceInPips) {
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

  function updateForExit(
    Storage storage self,
    address wallet,
    address assetAddress
  ) internal returns (uint64 previousExchangeBalanceInPips) {
    Balance storage balance;

    balance = loadBalanceAndMigrateIfNeeded(self, wallet, assetAddress);
    previousExchangeBalanceInPips = balance.balanceInPips;

    require(previousExchangeBalanceInPips > 0, 'No balance for asset');

    balance.balanceInPips = 0;
  }

  function executeAddLiquidity(
    Storage storage self,
    AssetRegistry.Storage storage assetRegistry,
    Structs.LiquidityAddition memory addition,
    Structs.LiquidityChangeExecution memory execution,
    address feeWallet
  ) internal {
    (
      uint256 grossBaseAssetQuantityInAssetUnits,
      uint256 feeBaseAssetQuantityInAssetUnits,
      uint256 grossQuoteAssetQuantityInAssetUnits,
      uint256 feeQuoteAssetQuantityInAssetUnits
    ) =
      execution.baseAssetAddress == addition.assetA
        ? (
          execution.amountA,
          execution.feeAmountA,
          execution.amountB,
          execution.feeAmountB
        )
        : (
          execution.amountB,
          execution.feeAmountB,
          execution.amountA,
          execution.feeAmountA
        );

    Structs.Asset memory asset;
    Balance storage balance;
    uint64 quantityInPips;

    // Base asset updates
    asset = assetRegistry.loadAssetByAddress(execution.baseAssetAddress);

    // Base gross debit
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      grossBaseAssetQuantityInAssetUnits,
      asset.decimals
    );
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      addition.wallet,
      execution.baseAssetAddress
    );
    balance.balanceInPips -= quantityInPips;

    // Base fee credit
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      feeBaseAssetQuantityInAssetUnits,
      asset.decimals
    );
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      feeWallet,
      execution.baseAssetAddress
    );
    balance.balanceInPips += quantityInPips;

    // Quote asset updates
    asset = assetRegistry.loadAssetByAddress(execution.quoteAssetAddress);

    // Quote gross debit
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      grossQuoteAssetQuantityInAssetUnits,
      asset.decimals
    );
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      addition.wallet,
      execution.quoteAssetAddress
    );
    balance.balanceInPips -= quantityInPips;

    // Quote fee credit
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      feeQuoteAssetQuantityInAssetUnits,
      asset.decimals
    );
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      feeWallet,
      execution.quoteAssetAddress
    );
    balance.balanceInPips += quantityInPips;
  }

  function executeRemoveLiquidity(
    Storage storage self,
    Structs.LiquidityRemoval memory removal,
    Structs.LiquidityChangeExecution memory execution,
    address feeWallet,
    address exchangeAddress,
    AssetRegistry.Storage storage assetRegistry
  )
    internal
    returns (
      uint256 outputBaseAssetQuantityInAssetUnits,
      uint256 outputQuoteAssetQuantityInAssetUnits
    )
  {
    (
      uint256 netBaseAssetQuantityInAssetUnits,
      uint256 feeBaseAssetQuantityInAssetUnits,
      uint256 netQuoteAssetQuantityInAssetUnits,
      uint256 feeQuoteAssetQuantityInAssetUnits
    ) =
      execution.baseAssetAddress == removal.assetA
        ? (
          execution.amountA - execution.feeAmountA,
          execution.feeAmountA,
          execution.amountB - execution.feeAmountB,
          execution.feeAmountB
        )
        : (
          execution.amountB - execution.feeAmountB,
          execution.feeAmountB,
          execution.amountA - execution.feeAmountA,
          execution.feeAmountA
        );

    Structs.Asset memory asset;
    Balance storage balance;
    uint64 quantityInPips;

    {
      // Base asset updates
      asset = assetRegistry.loadAssetByAddress(execution.baseAssetAddress);

      // Only add output assets to wallet's balances in the Exchange if latter is target
      if (removal.to == exchangeAddress) {
        // Base net credit
        quantityInPips = AssetUnitConversions.assetUnitsToPips(
          netBaseAssetQuantityInAssetUnits,
          asset.decimals
        );
        balance = loadBalanceAndMigrateIfNeeded(
          self,
          removal.wallet,
          execution.baseAssetAddress
        );
        balance.balanceInPips += quantityInPips;
      } else {
        outputBaseAssetQuantityInAssetUnits = netBaseAssetQuantityInAssetUnits;
      }

      // Base fee credit
      quantityInPips = AssetUnitConversions.assetUnitsToPips(
        feeBaseAssetQuantityInAssetUnits,
        asset.decimals
      );
      balance = loadBalanceAndMigrateIfNeeded(
        self,
        feeWallet,
        execution.baseAssetAddress
      );
      balance.balanceInPips += quantityInPips;

      // Quote asset updates
      asset = assetRegistry.loadAssetByAddress(execution.quoteAssetAddress);

      // Only add output assets to wallet's balances in the Exchange if latter is target
      if (removal.to == exchangeAddress) {
        // Quote net credit
        quantityInPips = AssetUnitConversions.assetUnitsToPips(
          netQuoteAssetQuantityInAssetUnits,
          asset.decimals
        );
        balance = loadBalanceAndMigrateIfNeeded(
          self,
          removal.wallet,
          execution.quoteAssetAddress
        );
        balance.balanceInPips += quantityInPips;
      } else {
        outputQuoteAssetQuantityInAssetUnits = netQuoteAssetQuantityInAssetUnits;
      }

      // Quote fee credit
      quantityInPips = AssetUnitConversions.assetUnitsToPips(
        feeQuoteAssetQuantityInAssetUnits,
        asset.decimals
      );
      balance = loadBalanceAndMigrateIfNeeded(
        self,
        feeWallet,
        execution.quoteAssetAddress
      );
      balance.balanceInPips += quantityInPips;
    }
  }

  function burnLiquidityTokens(
    Storage storage self,
    address pairTokenAddress,
    address wallet,
    uint256 liquidity
  ) internal {
    uint64 quantityInPips =
      AssetUnitConversions.assetUnitsToPips(
        liquidity,
        IPair(pairTokenAddress).decimals()
      );
    Balance storage balance =
      loadBalanceAndMigrateIfNeeded(self, wallet, pairTokenAddress);
    balance.balanceInPips -= quantityInPips;
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
