// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetRegistry } from './AssetRegistry.sol';
import { Constants } from './Constants.sol';
import { OrderSide } from './Enums.sol';
import { UUID } from './UUID.sol';
import { Validations } from './Validations.sol';
import { Asset, Order, PoolTrade } from './Structs.sol';

library PoolTradeValidations {
  using AssetRegistry for AssetRegistry.Storage;

  function validatePoolTrade(
    Order memory order,
    PoolTrade memory poolTrade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view returns (bytes32 orderHash) {
    orderHash = Validations.validateOrderSignature(
      order,
      poolTrade.baseAssetSymbol,
      poolTrade.quoteAssetSymbol
    );
    validateAssetPair(order, poolTrade, assetRegistry);
    validateLimitPrice(order, poolTrade);
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
        Validations.getImpliedQuoteQuantityInPips(
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
        Validations.getImpliedQuoteQuantityInPips(
          poolTrade.grossBaseQuantityInPips,
          order.limitPriceInPips
        ) <= poolTrade.grossQuoteQuantityInPips,
        'Sell order limit price exceeded'
      );
    }
  }

  function validateFees(OrderSide orderSide, PoolTrade memory poolTrade)
    internal
    pure
  {
    require(
      Validations.getFeeBasisPoints(
        (poolTrade.grossBaseQuantityInPips - poolTrade.netBaseQuantityInPips),
        poolTrade.grossBaseQuantityInPips
      ) <= Constants.maxTradeFeeBasisPoints,
      'Excessive base fee'
    );
    require(
      Validations.getFeeBasisPoints(
        (poolTrade.grossQuoteQuantityInPips - poolTrade.netQuoteQuantityInPips),
        poolTrade.grossQuoteQuantityInPips
      ) <= Constants.maxTradeFeeBasisPoints,
      'Excessive quote fee'
    );
    // Price correction only allowed for hybrid trades with a taker sell
    require(
      poolTrade.takerPriceCorrectionFeeQuantityInPips == 0,
      'Price correction not allowed'
    );

    Validations.validatePoolTradeFees(orderSide, poolTrade);
  }
}
