// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetRegistry } from './AssetRegistry.sol';
import { Constants } from './Constants.sol';
import { HybridTradeHelpers } from './HybridTradeHelpers.sol';
import { OrderBookTradeValidations } from './OrderBookTradeValidations.sol';
import { OrderSide } from './Enums.sol';
import { PoolTradeHelpers } from './PoolTradeHelpers.sol';
import { PoolTradeValidations } from './PoolTradeValidations.sol';
import { Validations } from './Validations.sol';
import {
  Asset,
  HybridTrade,
  Order,
  OrderBookTrade,
  NonceInvalidation,
  PoolTrade
} from './Structs.sol';

library HybridTradeValidations {
  using AssetRegistry for AssetRegistry.Storage;
  using HybridTradeHelpers for HybridTrade;
  using PoolTradeHelpers for PoolTrade;

  function validateHybridTrade(
    Order memory buy,
    Order memory sell,
    HybridTrade memory hybridTrade,
    AssetRegistry.Storage storage assetRegistry,
    mapping(address => NonceInvalidation) storage nonceInvalidations
  ) internal view returns (bytes32 buyHash, bytes32 sellHash) {
    require(
      buy.walletAddress != sell.walletAddress,
      'Self-trading not allowed'
    );

    require(
      hybridTrade.orderBookTrade.baseAssetAddress ==
        hybridTrade.poolTrade.baseAssetAddress &&
        hybridTrade.orderBookTrade.quoteAssetAddress ==
        hybridTrade.poolTrade.quoteAssetAddress,
      'Mismatched trade assets'
    );
    validateFees(hybridTrade);

    // Order book trade validations
    Validations.validateOrderNonces(buy, sell, nonceInvalidations);
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
        Validations.calculateImpliedQuoteQuantityInPips(
          baseAssetReserveInPips,
          makerOrder.limitPriceInPips
        ) <= quoteAssetReserveInPips,
        'Pool marginal buy price exceeded'
      );
    }

    if (
      makerOrder.side == OrderSide.Sell &&
      Validations.isLimitOrderType(makerOrder.orderType)
    ) {
      // Price of pool must not be better (higher) than resting sell price
      require(
        Validations.calculateImpliedQuoteQuantityInPips(
          baseAssetReserveInPips,
          makerOrder.limitPriceInPips
          // Allow 1 pip buffer for integer rounding
        ) +
          1 >=
          quoteAssetReserveInPips,
        'Pool marginal sell price exceeded'
      );
    }
  }

  function validateFees(HybridTrade memory hybridTrade) private pure {
    require(
      hybridTrade.poolTrade.takerGasFeeQuantityInPips == 0,
      'Non-zero pool gas fee'
    );

    // Validate maker fee on orderbook trade
    uint64 grossQuantityInPips = hybridTrade.getMakerGrossQuantityInPips();
    require(
      Validations.isFeeQuantityValid(
        (grossQuantityInPips - hybridTrade.getMakerNetQuantityInPips()),
        grossQuantityInPips,
        Constants.maxFeeBasisPoints
      ),
      'Excessive maker fee'
    );

    OrderSide takerOrderSide =
      hybridTrade.orderBookTrade.makerSide == OrderSide.Buy
        ? OrderSide.Sell
        : OrderSide.Buy;

    // Validate taker fees across orderbook and pool trades
    grossQuantityInPips = hybridTrade
      .calculateTakerGrossReceivedQuantityInPips();
    require(
      Validations.isFeeQuantityValid(
        hybridTrade.poolTrade.calculatePoolOutputAdjustment(takerOrderSide),
        grossQuantityInPips,
        Constants.maxPoolOutputAdjustmentBasisPoints
      ),
      'Excessive pool output adjustment'
    );
    require(
      Validations.isFeeQuantityValid(
        hybridTrade.calculateTakerFeeQuantityInPips(),
        grossQuantityInPips,
        Constants.maxFeeBasisPoints
      ),
      'Excessive taker fee'
    );

    // Validate price correction, if present
    if (hybridTrade.poolTrade.takerPriceCorrectionFeeQuantityInPips > 0) {
      // Price correction only allowed for hybrid trades with a taker sell
      require(
        hybridTrade.orderBookTrade.makerSide == OrderSide.Buy,
        'Price correction not allowed'
      );

      // Do not allow quote output with a price correction as the latter is effectively a negative
      // net quote output
      require(
        hybridTrade.poolTrade.netQuoteQuantityInPips == 0,
        'Quote out not allowed with price correction'
      );

      grossQuantityInPips = hybridTrade
        .poolTrade
        .getOrderGrossReceivedQuantityInPips(takerOrderSide);
      if (
        hybridTrade.poolTrade.takerPriceCorrectionFeeQuantityInPips >
        grossQuantityInPips
      ) {
        require(
          Validations.isFeeQuantityValid(
            hybridTrade.poolTrade.takerPriceCorrectionFeeQuantityInPips -
              grossQuantityInPips,
            grossQuantityInPips,
            Constants.maxPoolPriceCorrectionBasisPoints
          ),
          'Excessive price correction'
        );
      }
    }

    Validations.validatePoolTradeInputFees(
      takerOrderSide,
      hybridTrade.poolTrade
    );
    Validations.validateOrderBookTradeFees(hybridTrade.orderBookTrade);
  }
}
