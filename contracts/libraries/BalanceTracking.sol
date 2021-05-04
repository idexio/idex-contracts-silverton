// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import {
  IPair
} from '@idexio/pancake-swap-core/contracts/interfaces/IPair.sol';

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { Constants } from './Constants.sol';
import { IExchange } from './Interfaces.sol';
import { PoolTradeHelpers } from './PoolTradeHelpers.sol';
import {
  Asset,
  LiquidityAddition,
  LiquidityChangeExecution,
  LiquidityRemoval,
  Order,
  PoolTrade,
  Trade,
  Withdrawal
} from './Structs.sol';

library BalanceTracking {
  using AssetRegistry for AssetRegistry.Storage;
  using PoolTradeHelpers for PoolTrade;

  struct Balance {
    bool isMigrated;
    uint64 balanceInPips;
  }

  struct Storage {
    mapping(address => mapping(address => Balance)) balancesByWalletAssetPair;
    // Predecessor Exchange contract from which to lazily migrate balances
    IExchange migrationSource;
  }

  // Depositing //

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

  // Trading //

  /**
   * @dev Updates buyer, seller, and fee wallet balances for both assets in trade pair according to
   * trade parameters
   */
  function updateForTrade(
    Storage storage self,
    Order memory buy,
    Order memory sell,
    Trade memory trade,
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

    // Maker fee to fee wallet
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      feeWallet,
      trade.makerFeeAssetAddress
    );
    balance.balanceInPips += trade.makerFeeQuantityInPips;
    // Taker fee to fee wallet
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      feeWallet,
      trade.takerFeeAssetAddress
    );
    balance.balanceInPips += trade.takerFeeQuantityInPips;
  }

  function updateForPoolTrade(
    Storage storage self,
    Order memory order,
    PoolTrade memory poolTrade,
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

    // Liquidity pool reserves are updated in LiquidityPoolRegistry
  }

  // Withdrawing //

  function updateForWithdrawal(
    Storage storage self,
    Withdrawal memory withdrawal,
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

  // Wallet exits //

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

  // Liquidity pools //

  function updateForAddLiquidity(
    Storage storage self,
    LiquidityAddition memory addition,
    LiquidityChangeExecution memory execution,
    uint8 baseAssetDecimals,
    uint8 quoteAssetDecimals,
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

    // Base gross debit
    uint64 quantityInPips =
      AssetUnitConversions.assetUnitsToPips(
        grossBaseAssetQuantityInAssetUnits,
        baseAssetDecimals
      );
    Balance storage balance =
      loadBalanceAndMigrateIfNeeded(
        self,
        addition.wallet,
        execution.baseAssetAddress
      );
    balance.balanceInPips -= quantityInPips;

    // Base fee credit
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      feeBaseAssetQuantityInAssetUnits,
      baseAssetDecimals
    );
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      feeWallet,
      execution.baseAssetAddress
    );
    balance.balanceInPips += quantityInPips;

    // Quote gross debit
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      grossQuoteAssetQuantityInAssetUnits,
      quoteAssetDecimals
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
      quoteAssetDecimals
    );
    balance = loadBalanceAndMigrateIfNeeded(
      self,
      feeWallet,
      execution.quoteAssetAddress
    );
    balance.balanceInPips += quantityInPips;
  }

  /**
   * @dev Uses disjoint scopes for base asset, quote asset, and Pair token updates to avoid stack
   * too deep error
   */
  function updateForRemoveLiquidity(
    Storage storage self,
    LiquidityRemoval memory removal,
    LiquidityChangeExecution memory execution,
    address feeWallet,
    address exchangeAddress,
    IPair pairTokenAddress,
    AssetRegistry.Storage storage assetRegistry
  )
    internal
    returns (
      uint256 outputBaseAssetQuantityInAssetUnits,
      uint256 outputQuoteAssetQuantityInAssetUnits
    )
  {
    Balance storage balance;
    uint64 quantityInPips;

    // Base asset updates
    {
      Asset memory asset =
        assetRegistry.loadAssetByAddress(execution.baseAssetAddress);
      (
        uint256 netBaseAssetQuantityInAssetUnits,
        uint256 feeBaseAssetQuantityInAssetUnits
      ) =
        execution.baseAssetAddress == removal.assetA
          ? (execution.amountA - execution.feeAmountA, execution.feeAmountA)
          : (execution.amountB - execution.feeAmountB, execution.feeAmountB);

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
    }

    // Quote asset updates
    {
      (
        uint256 netQuoteAssetQuantityInAssetUnits,
        uint256 feeQuoteAssetQuantityInAssetUnits
      ) =
        execution.baseAssetAddress == removal.assetA
          ? (execution.amountB - execution.feeAmountB, execution.feeAmountB)
          : (execution.amountA - execution.feeAmountA, execution.feeAmountA);

      Asset memory asset =
        assetRegistry.loadAssetByAddress(execution.quoteAssetAddress);

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

    // Pair token burn
    {
      quantityInPips = AssetUnitConversions.assetUnitsToPips(
        execution.liquidity,
        Constants.pairTokenDecimals
      );
      balance = loadBalanceAndMigrateIfNeeded(
        self,
        removal.wallet,
        address(pairTokenAddress)
      );
      balance.balanceInPips -= quantityInPips;
    }
  }

  // Helpers //

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
