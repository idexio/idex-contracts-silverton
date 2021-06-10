// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetRegistry } from './AssetRegistry.sol';
import { Constants } from './Constants.sol';
import { HybridTradeHelpers } from './HybridTradeHelpers.sol';
import { OrderBookTradeValidations } from './OrderBookTradeValidations.sol';
import { OrderSide } from './Enums.sol';
import { PoolTradeValidations } from './PoolTradeValidations.sol';
import { Validations } from './Validations.sol';
import {
  Asset,
  HybridTrade,
  Order,
  OrderBookTrade,
  PoolTrade
} from './Structs.sol';

library HybridTradeValidations {
  using AssetRegistry for AssetRegistry.Storage;
  using HybridTradeHelpers for HybridTrade;

  function validateHybridTrade(
    Order memory buy,
    Order memory sell,
    HybridTrade memory hybridTrade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view returns (bytes32 buyHash, bytes32 sellHash) {
    require(
      hybridTrade.orderBookTrade.baseAssetAddress ==
        hybridTrade.poolTrade.baseAssetAddress &&
        hybridTrade.orderBookTrade.quoteAssetAddress ==
        hybridTrade.poolTrade.quoteAssetAddress,
      'Mismatched trade assets'
    );
    validateFees(hybridTrade);

    // Order book trade validations
    (buyHash, sellHash) = OrderBookTradeValidations.validateOrderSignatures(
      buy,
      sell,
      hybridTrade.orderBookTrade
    );
    OrderBookTradeValidations.validateAssetPair(
      buy,
      sell,
      hybridTrade.orderBookTrade,
      assetRegistry
    );
    OrderBookTradeValidations.validateLimitPrices(
      buy,
      sell,
      hybridTrade.orderBookTrade
    );

    // Pool trade validations
    Order memory takerOrder =
      hybridTrade.orderBookTrade.makerSide == OrderSide.Buy ? sell : buy;
    PoolTradeValidations.validateLimitPrice(takerOrder, hybridTrade.poolTrade);
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

  function validateFees(HybridTrade memory hybridTrade) private pure {
    // Validate maker fee on orderbook trade
    uint64 grossQuantityInPips = hybridTrade.makerGrossQuantityInPips();
    require(
      Validations.getFeeBasisPoints(
        (grossQuantityInPips - hybridTrade.makerNetQuantityInPips()),
        grossQuantityInPips
      ) <= Constants.maxTradeFeeBasisPoints,
      'Excessive maker fee'
    );

    // Validate taker fee across orderbook and pool trades
    grossQuantityInPips = hybridTrade.takerGrossQuantityInPips();
    require(
      Validations.getFeeBasisPoints(
        (grossQuantityInPips - hybridTrade.takerNetQuantityInPips()),
        grossQuantityInPips
      ) <= Constants.maxTradeFeeBasisPoints,
      'Excessive taker fee'
    );

    require(
      hybridTrade.poolTrade.takerGasFeeQuantityInPips == 0,
      'Non-zero pool gas fee'
    );
  }
}
