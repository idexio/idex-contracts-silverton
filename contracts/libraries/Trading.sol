// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetRegistry } from './AssetRegistry.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { LiquidityPoolRegistry } from './LiquidityPoolRegistry.sol';
import { PoolTradeHelpers } from './PoolTradeHelpers.sol';
import { Validations } from './Validations.sol';
import { OrderSide, OrderType } from './Enums.sol';
import { Order, PoolTrade, Trade } from './Structs.sol';

library Trading {
  using AssetRegistry for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;
  using LiquidityPoolRegistry for LiquidityPoolRegistry.Storage;
  using PoolTradeHelpers for PoolTrade;

  function executeOrderBookTrade(
    Order memory buy,
    Order memory sell,
    Trade memory trade,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking,
    mapping(bytes32 => bool) storage completedOrderHashes,
    mapping(bytes32 => uint64) storage partiallyFilledOrderQuantitiesInPips
  ) public {
    (bytes32 buyHash, bytes32 sellHash) =
      Validations.validateOrderBookTrade(buy, sell, trade, assetRegistry);

    updateOrderFilledQuantities(
      buy,
      buyHash,
      sell,
      sellHash,
      trade,
      completedOrderHashes,
      partiallyFilledOrderQuantitiesInPips
    );

    balanceTracking.updateForTrade(buy, sell, trade, feeWallet);
  }

  function executeHybridTrade(
    Order memory buy,
    Order memory sell,
    Trade memory trade,
    PoolTrade memory poolTrade,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    LiquidityPoolRegistry.Storage storage liquidityPoolRegistry,
    BalanceTracking.Storage storage balanceTracking,
    mapping(bytes32 => bool) storage completedOrderHashes,
    mapping(bytes32 => uint64) storage partiallyFilledOrderQuantitiesInPips
  ) public {
    (bytes32 buyHash, bytes32 sellHash) =
      Validations.validateHybridTrade(
        buy,
        sell,
        trade,
        poolTrade,
        assetRegistry
      );

    {
      // Pool trade
      (Order memory order, bytes32 orderHash) =
        trade.makerSide == OrderSide.Buy ? (sell, sellHash) : (buy, buyHash);
      updateOrderFilledQuantity(
        order,
        orderHash,
        poolTrade.grossBaseQuantityInPips,
        poolTrade.grossQuoteQuantityInPips,
        completedOrderHashes,
        partiallyFilledOrderQuantitiesInPips
      );

      balanceTracking.updateForPoolTrade(order, poolTrade, feeWallet);

      (uint64 baseAssetReserveInPips, uint64 quoteAssetReserveInPips) =
        liquidityPoolRegistry.updateReservesForPoolTrade(poolTrade, order.side);

      Validations.validateLimitPrice(
        order,
        baseAssetReserveInPips,
        quoteAssetReserveInPips
      );
    }

    {
      // Order book trade
      updateOrderFilledQuantities(
        buy,
        buyHash,
        sell,
        sellHash,
        trade,
        completedOrderHashes,
        partiallyFilledOrderQuantitiesInPips
      );

      balanceTracking.updateForTrade(buy, sell, trade, feeWallet);
    }
  }

  function executePoolTrade(
    Order memory order,
    PoolTrade memory poolTrade,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    LiquidityPoolRegistry.Storage storage liquidityPoolRegistry,
    BalanceTracking.Storage storage balanceTracking,
    mapping(bytes32 => bool) storage completedOrderHashes,
    mapping(bytes32 => uint64) storage partiallyFilledOrderQuantitiesInPips
  ) public {
    bytes32 orderHash =
      Validations.validatePoolTrade(order, poolTrade, assetRegistry);

    updateOrderFilledQuantity(
      order,
      orderHash,
      poolTrade.grossBaseQuantityInPips,
      poolTrade.grossQuoteQuantityInPips,
      completedOrderHashes,
      partiallyFilledOrderQuantitiesInPips
    );

    balanceTracking.updateForPoolTrade(order, poolTrade, feeWallet);
    liquidityPoolRegistry.updateReservesForPoolTrade(poolTrade, order.side);
  }

  function updateOrderFilledQuantities(
    Order memory buy,
    bytes32 buyHash,
    Order memory sell,
    bytes32 sellHash,
    Trade memory trade,
    mapping(bytes32 => bool) storage completedOrderHashes,
    mapping(bytes32 => uint64) storage partiallyFilledOrderQuantitiesInPips
  ) private {
    // Order book trade
    updateOrderFilledQuantity(
      buy,
      buyHash,
      trade.grossBaseQuantityInPips,
      trade.grossQuoteQuantityInPips,
      completedOrderHashes,
      partiallyFilledOrderQuantitiesInPips
    );
    updateOrderFilledQuantity(
      sell,
      sellHash,
      trade.grossBaseQuantityInPips,
      trade.grossQuoteQuantityInPips,
      completedOrderHashes,
      partiallyFilledOrderQuantitiesInPips
    );
  }

  // Update filled quantities tracking for order to prevent over- or double-filling orders
  function updateOrderFilledQuantity(
    Order memory order,
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

  function isMarketOrderType(OrderType orderType) private pure returns (bool) {
    return
      orderType == OrderType.Market ||
      orderType == OrderType.StopLoss ||
      orderType == OrderType.TakeProfit;
  }
}
