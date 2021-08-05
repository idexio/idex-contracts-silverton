// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetRegistry } from './AssetRegistry.sol';
import { Constants } from './Constants.sol';
import { OrderSide } from './Enums.sol';
import { PoolTradeHelpers } from './PoolTradeHelpers.sol';
import { UUID } from './UUID.sol';
import { Validations } from './Validations.sol';
import { Asset, Order, NonceInvalidation, PoolTrade } from './Structs.sol';

library PoolTradeValidations {
  using AssetRegistry for AssetRegistry.Storage;
  using PoolTradeHelpers for PoolTrade;

  function validatePoolTrade(
    Order memory order,
    PoolTrade memory poolTrade,
    AssetRegistry.Storage storage assetRegistry,
    mapping(address => NonceInvalidation) storage nonceInvalidations
  ) internal view returns (bytes32 orderHash) {
    orderHash = Validations.validateOrderSignature(
      order,
      poolTrade.baseAssetSymbol,
      poolTrade.quoteAssetSymbol
    );
    validateAssetPair(order, poolTrade, assetRegistry);
    validateLimitPrice(order, poolTrade);
    Validations.validateOrderNonce(order, nonceInvalidations);
    validateFees(order.side, poolTrade);
  }

  function validateAssetPair(
    Order memory order,
    PoolTrade memory poolTrade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view {
    require(
      poolTrade.baseAssetAddress != poolTrade.quoteAssetAddress,
      'Trade assets must be different'
    );

    uint64 timestampInMs = UUID.getTimestampInMsFromUuidV1(order.nonce);
    Asset memory baseAsset =
      assetRegistry.loadAssetBySymbol(poolTrade.baseAssetSymbol, timestampInMs);
    Asset memory quoteAsset =
      assetRegistry.loadAssetBySymbol(
        poolTrade.quoteAssetSymbol,
        timestampInMs
      );

    require(
      baseAsset.assetAddress == poolTrade.baseAssetAddress &&
        quoteAsset.assetAddress == poolTrade.quoteAssetAddress,
      'Order symbol address mismatch'
    );
  }

  function validateLimitPrice(Order memory order, PoolTrade memory poolTrade)
    internal
    pure
  {
    require(
      poolTrade.grossBaseQuantityInPips > 0,
      'Base quantity must be greater than zero'
    );
    require(
      poolTrade.grossQuoteQuantityInPips > 0,
      'Quote quantity must be greater than zero'
    );

    if (
      order.side == OrderSide.Buy &&
      Validations.isLimitOrderType(order.orderType)
    ) {
      require(
        Validations.calculateImpliedQuoteQuantityInPips(
          poolTrade.grossBaseQuantityInPips,
          order.limitPriceInPips
        ) >= poolTrade.grossQuoteQuantityInPips,
        'Buy order limit price exceeded'
      );
    }

    if (
      order.side == OrderSide.Sell &&
      Validations.isLimitOrderType(order.orderType)
    ) {
      require(
        Validations.calculateImpliedQuoteQuantityInPips(
          poolTrade.grossBaseQuantityInPips - 1,
          order.limitPriceInPips
        ) <= poolTrade.grossQuoteQuantityInPips,
        'Sell order limit price exceeded'
      );
    }
  }

  function validateFees(OrderSide orderSide, PoolTrade memory poolTrade)
    private
    pure
  {
    require(
      Validations.isFeeQuantityValid(
        poolTrade.calculatePoolOutputAdjustment(orderSide),
        poolTrade.getOrderGrossReceivedQuantityInPips(orderSide),
        Constants.maxPoolOutputAdjustmentBasisPoints
      ),
      'Excessive pool output adjustment'
    );

    require(
      Validations.isFeeQuantityValid(
        poolTrade.takerGasFeeQuantityInPips,
        poolTrade.getOrderGrossReceivedQuantityInPips(orderSide),
        Constants.maxFeeBasisPoints
      ),
      'Excessive gas fee'
    );

    // Price correction only allowed for hybrid trades with a taker sell
    require(
      poolTrade.takerPriceCorrectionFeeQuantityInPips == 0,
      'Price correction not allowed'
    );

    Validations.validatePoolTradeInputFees(orderSide, poolTrade);
  }
}
