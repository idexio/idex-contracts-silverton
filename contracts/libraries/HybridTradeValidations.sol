// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetRegistry } from './AssetRegistry.sol';
import { OrderBookTradeValidations } from './OrderBookTradeValidations.sol';
import { OrderSide } from './Enums.sol';
import { PoolTradeValidations } from './PoolTradeValidations.sol';
import { Validations } from './Validations.sol';
import { Asset, Order, OrderBookTrade, PoolTrade } from './Structs.sol';

library HybridTradeValidations {
  using AssetRegistry for AssetRegistry.Storage;

  function validateHybridTrade(
    Order memory buy,
    Order memory sell,
    OrderBookTrade memory trade,
    PoolTrade memory poolTrade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view returns (bytes32 buyHash, bytes32 sellHash) {
    // Order book trade validations
    (buyHash, sellHash) = OrderBookTradeValidations.validateOrderSignatures(
      buy,
      sell,
      trade
    );
    OrderBookTradeValidations.validateAssetPair(
      buy,
      sell,
      trade,
      assetRegistry
    );
    OrderBookTradeValidations.validateLimitPrices(buy, sell, trade);
    OrderBookTradeValidations.validateOrderBookTradeFees(trade);

    // Pool trade validations
    require(
      trade.baseAssetAddress == poolTrade.baseAssetAddress &&
        trade.quoteAssetAddress == poolTrade.quoteAssetAddress,
      'Mismatched trade assets'
    );
    Order memory takerOrder = trade.makerSide == OrderSide.Buy ? sell : buy;
    PoolTradeValidations.validateLimitPrice(takerOrder, poolTrade);
    PoolTradeValidations.validatePoolTradeFees(takerOrder.side, poolTrade);
  }

  function validatePoolPrice(
    Order memory makerOrder,
    uint64 baseAssetReserveInPips,
    uint64 quoteAssetReserveInPips
  ) internal pure {
    if (
      makerOrder.side == OrderSide.Buy &&
      Validations.isLimitOrderType(makerOrder.orderType)
    ) {
      // Price of pool must not be better (lower) than resting buy price
      require(
        Validations.getImpliedQuoteQuantityInPips(
          baseAssetReserveInPips,
          makerOrder.limitPriceInPips
          // Allow 1 pip buffer for integer rounding
        ) <= quoteAssetReserveInPips + 1,
        'Pool marginal buy price exceeded'
      );
    }

    if (
      makerOrder.side == OrderSide.Sell &&
      Validations.isLimitOrderType(makerOrder.orderType)
    ) {
      // Price of pool must not be better (higher) than resting sell price
      require(
        Validations.getImpliedQuoteQuantityInPips(
          baseAssetReserveInPips,
          makerOrder.limitPriceInPips
          // Allow 1 pip buffer for integer rounding
        ) >= quoteAssetReserveInPips - 1,
        'Pool marginal sell price exceeded'
      );
    }
  }
}
