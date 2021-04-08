// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { Address } from '@openzeppelin/contracts/utils/Address.sol';
import { ECDSA } from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetRegistryAdmin } from './AssetRegistryAdmin.sol';
import { AssetTransfers } from './AssetTransfers.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { LiquidityPoolRegistry } from './LiquidityPoolRegistry.sol';
import { PoolTradeHelpers } from './PoolTradeHelpers.sol';
import { Validations } from './Validations.sol';
import {
  Enums,
  ICustodian,
  IERC20,
  IExchange,
  Structs
} from './Interfaces.sol';
import { UUID } from './UUID.sol';

library HybridTrade {
  using PoolTradeHelpers for Structs.PoolTrade;

  // Internally used structs //

  struct NonceInvalidation {
    bool exists;
    uint64 timestampInMs;
    uint256 effectiveBlockNumber;
  }
  struct WalletExit {
    bool exists;
    uint256 effectiveBlockNumber;
  }

  uint64 constant _maxTradeFeeBasisPoints = 20 * 100; // 20%;

  function executeHybridTrade(
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade,
    Structs.PoolTrade memory poolTrade,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    LiquidityPoolRegistry.Storage storage liquidityPoolRegistry,
    BalanceTracking.Storage storage balanceTracking,
    mapping(bytes32 => bool) storage completedOrderHashes,
    mapping(bytes32 => uint64) storage partiallyFilledOrderQuantitiesInPips
  ) public {
    (bytes32 buyHash, bytes32 sellHash) =
      Validations.validateHybridTrade(
        assetRegistry,
        buy,
        sell,
        trade,
        poolTrade,
        _maxTradeFeeBasisPoints
      );

    {
      // Pool trade
      (Structs.Order memory order, bytes32 orderHash) =
        trade.makerSide == Enums.OrderSide.Buy
          ? (sell, sellHash)
          : (buy, buyHash);
      updateOrderFilledQuantity(
        order,
        orderHash,
        poolTrade.grossBaseQuantityInPips,
        poolTrade.grossQuoteQuantityInPips,
        completedOrderHashes,
        partiallyFilledOrderQuantitiesInPips
      );
      updateBalancesForPoolTrade(order, poolTrade, feeWallet, balanceTracking);
      updateReservesForPoolTrade(poolTrade, order.side, liquidityPoolRegistry);

      // TODO Validate pool did not fill order past counterparty order's price
    }

    {
      // Counterparty trade
      updateOrderFilledQuantities(
        buy,
        buyHash,
        sell,
        sellHash,
        trade,
        completedOrderHashes,
        partiallyFilledOrderQuantitiesInPips
      );
      updateBalancesForTrade(buy, sell, trade, feeWallet, balanceTracking);
    }
  }

  function updateBalancesForPoolTrade(
    Structs.Order memory order,
    Structs.PoolTrade memory poolTrade,
    address feeWallet,
    BalanceTracking.Storage storage balanceTracking
  ) private {
    BalanceTracking.Balance storage balance;

    // Debit from order wallet
    balance = loadBalanceAndMigrateIfNeeded(
      order.walletAddress,
      poolTrade.getOrderDebitAssetAddress(order.side),
      balanceTracking
    );
    balance.balanceInPips -= poolTrade.getOrderDebitQuantity(order.side);
    // Credit to order wallet
    balance = loadBalanceAndMigrateIfNeeded(
      order.walletAddress,
      poolTrade.getOrderCreditAssetAddress(order.side),
      balanceTracking
    );
    balance.balanceInPips += poolTrade.getOrderCreditQuantity(order.side);

    // Fee wallet receives protocol fee from asset debited from order wallet
    balance = loadBalanceAndMigrateIfNeeded(
      feeWallet,
      poolTrade.getOrderDebitAssetAddress(order.side),
      balanceTracking
    );
    balance.balanceInPips += poolTrade.takerProtocolFeeQuantityInPips;
    // Fee wallet receives gas fee from asset credited to order wallet
    balance = loadBalanceAndMigrateIfNeeded(
      feeWallet,
      poolTrade.getOrderCreditAssetAddress(order.side),
      balanceTracking
    );
    balance.balanceInPips += poolTrade.takerGasFeeQuantityInPips;

    // Liquidity pool reserves are updated separately
  }

  function updateBalancesForTrade(
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade,
    address feeWallet,
    BalanceTracking.Storage storage balanceTracking
  ) private {
    BalanceTracking.Balance storage balance;

    // Seller gives base asset including fees
    balance = loadBalanceAndMigrateIfNeeded(
      sell.walletAddress,
      trade.baseAssetAddress,
      balanceTracking
    );
    balance.balanceInPips -= trade.grossBaseQuantityInPips;
    // Buyer receives base asset minus fees
    balance = loadBalanceAndMigrateIfNeeded(
      buy.walletAddress,
      trade.baseAssetAddress,
      balanceTracking
    );
    balance.balanceInPips += trade.netBaseQuantityInPips;

    // Buyer gives quote asset including fees
    balance = loadBalanceAndMigrateIfNeeded(
      buy.walletAddress,
      trade.quoteAssetAddress,
      balanceTracking
    );
    balance.balanceInPips -= trade.grossQuoteQuantityInPips;
    // Seller receives quote asset minus fees
    balance = loadBalanceAndMigrateIfNeeded(
      sell.walletAddress,
      trade.quoteAssetAddress,
      balanceTracking
    );
    balance.balanceInPips += trade.netQuoteQuantityInPips;

    // Maker and taker fees to fee wallet
    balance = loadBalanceAndMigrateIfNeeded(
      feeWallet,
      trade.makerFeeAssetAddress,
      balanceTracking
    );
    balance.balanceInPips += trade.makerFeeQuantityInPips;
    balance = loadBalanceAndMigrateIfNeeded(
      feeWallet,
      trade.takerFeeAssetAddress,
      balanceTracking
    );
    balance.balanceInPips += trade.takerFeeQuantityInPips;
  }

  function updateOrderFilledQuantities(
    Structs.Order memory buyOrder,
    bytes32 buyOrderHash,
    Structs.Order memory sellOrder,
    bytes32 sellOrderHash,
    Structs.Trade memory trade,
    mapping(bytes32 => bool) storage completedOrderHashes,
    mapping(bytes32 => uint64) storage partiallyFilledOrderQuantitiesInPips
  ) private {
    updateOrderFilledQuantity(
      buyOrder,
      buyOrderHash,
      trade.grossBaseQuantityInPips,
      trade.grossQuoteQuantityInPips,
      completedOrderHashes,
      partiallyFilledOrderQuantitiesInPips
    );
    updateOrderFilledQuantity(
      sellOrder,
      sellOrderHash,
      trade.grossBaseQuantityInPips,
      trade.grossQuoteQuantityInPips,
      completedOrderHashes,
      partiallyFilledOrderQuantitiesInPips
    );
  }

  // Update filled quantities tracking for order to prevent over- or double-filling orders
  function updateOrderFilledQuantity(
    Structs.Order memory order,
    bytes32 orderHash,
    uint64 grossBaseQuantityInPips,
    uint64 grossQuoteQuantityInPips,
    mapping(bytes32 => bool) storage completedOrderHashes,
    mapping(bytes32 => uint64) storage partiallyFilledOrderQuantitiesInPips
  ) private {
    require(!completedOrderHashes[orderHash], 'Order double filled');

    // Total quantity of above filled as a result of all trade executions, including this one
    uint64 newFilledQuantityInPips;

    // Market orders can express quantity in quote terms, and can be partially filled by multiple
    // limit maker orders necessitating tracking partially filled amounts in quote terms to
    // determine completion
    if (order.isQuantityInQuote) {
      require(
        isMarketOrderType(order.orderType),
        'Order quote quantity only valid for market orders'
      );
      newFilledQuantityInPips =
        grossQuoteQuantityInPips +
        partiallyFilledOrderQuantitiesInPips[orderHash];
    } else {
      // All other orders track partially filled quantities in base terms
      newFilledQuantityInPips =
        grossBaseQuantityInPips +
        partiallyFilledOrderQuantitiesInPips[orderHash];
    }

    uint64 quantityInPips = order.quantityInPips;
    require(newFilledQuantityInPips <= quantityInPips, 'Order overfilled');
    if (newFilledQuantityInPips < quantityInPips) {
      // If the order was partially filled, track the new filled quantity
      partiallyFilledOrderQuantitiesInPips[orderHash] = newFilledQuantityInPips;
    } else {
      // If the order was completed, delete any partial fill tracking and instead track its completion
      // to prevent future double fills
      delete partiallyFilledOrderQuantitiesInPips[orderHash];
      completedOrderHashes[orderHash] = true;
    }
  }

  function isMarketOrderType(Enums.OrderType orderType)
    private
    pure
    returns (bool)
  {
    return
      orderType == Enums.OrderType.Market ||
      orderType == Enums.OrderType.StopLoss ||
      orderType == Enums.OrderType.TakeProfit;
  }

  function loadBalanceAndMigrateIfNeeded(
    address wallet,
    address assetAddress,
    BalanceTracking.Storage storage balanceTracking
  ) private returns (BalanceTracking.Balance storage) {
    BalanceTracking.Balance storage balance =
      balanceTracking.balancesByWalletAssetPair[wallet][assetAddress];

    if (!balance.isMigrated) {
      balance.balanceInPips = balanceTracking
        .migrationSource
        .loadBalanceInPipsByAddress(wallet, assetAddress);
      balance.isMigrated = true;
    }

    return balance;
  }

  function updateReservesForPoolTrade(
    Structs.PoolTrade memory poolTrade,
    Enums.OrderSide orderSide,
    LiquidityPoolRegistry.Storage storage liquidityPoolRegistry
  ) private {
    LiquidityPoolRegistry.LiquidityPool storage pool =
      loadLiquidityPoolByAssetAddresses(
        poolTrade.baseAssetAddress,
        poolTrade.quoteAssetAddress,
        liquidityPoolRegistry
      );

    uint128 initialProduct =
      uint128(pool.baseAssetReserveInPips) *
        uint128(pool.quoteAssetReserveInPips);
    uint128 updatedProduct;

    if (orderSide == Enums.OrderSide.Buy) {
      // Pool gives base asset
      pool.baseAssetReserveInPips -= poolTrade.grossBaseQuantityInPips;
      // Pool receives quote asset
      pool.quoteAssetReserveInPips +=
        poolTrade.grossQuoteQuantityInPips -
        poolTrade.takerProtocolFeeQuantityInPips;

      updatedProduct =
        uint128(pool.baseAssetReserveInPips) *
        uint128(
          pool.quoteAssetReserveInPips - poolTrade.takerPoolFeeQuantityInPips
        );
    } else {
      // Pool receives base asset
      pool.baseAssetReserveInPips +=
        poolTrade.grossBaseQuantityInPips -
        poolTrade.takerProtocolFeeQuantityInPips;
      // Pool gives quote asset
      pool.quoteAssetReserveInPips -= poolTrade.grossQuoteQuantityInPips;

      updatedProduct =
        uint128(
          pool.baseAssetReserveInPips - poolTrade.takerPoolFeeQuantityInPips
        ) *
        uint128(pool.quoteAssetReserveInPips);
    }

    require(
      updatedProduct >= initialProduct,
      'Constant product cannot decrease'
    );
  }

  function loadLiquidityPoolByAssetAddresses(
    address baseAssetAddress,
    address quoteAssetAddress,
    LiquidityPoolRegistry.Storage storage liquidityPoolRegistry
  ) private view returns (LiquidityPoolRegistry.LiquidityPool storage pool) {
    pool = liquidityPoolRegistry.poolsByAddresses[baseAssetAddress][
      quoteAssetAddress
    ];
    require(pool.exists, 'No pool found for address pair');
  }
}
