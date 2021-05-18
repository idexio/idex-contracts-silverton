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
    validatePoolTradeFees(order.side, poolTrade);
  }

  function validatePoolTradeFees(
    OrderSide orderSide,
    PoolTrade memory poolTrade
  ) internal pure {
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

    // The received quantity is determined by the pool's constant product formula and enforced in
    // `LiquidityPoolRegistry.updateReservesForPoolTrade`
    if (orderSide == OrderSide.Buy) {
      // Buy order sends quote as pool input, receives base as pool output
      require(
        poolTrade.netQuoteQuantityInPips +
          poolTrade.takerPoolFeeQuantityInPips +
          poolTrade.takerPoolProtocolFeeQuantityInPips ==
          poolTrade.grossQuoteQuantityInPips,
        'Net plus fee not equal to gross'
      );
    } else {
      // Sell order sends base as pool input, receives quote as pool output
      require(
        poolTrade.netBaseQuantityInPips +
          poolTrade.takerPoolFeeQuantityInPips +
          poolTrade.takerPoolProtocolFeeQuantityInPips ==
          poolTrade.grossBaseQuantityInPips,
        'Net plus fee not equal to gross'
      );
    }
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

    uint64 nonce = UUID.getTimestampInMsFromUuidV1(order.nonce);
    Asset memory baseAsset =
      assetRegistry.loadAssetBySymbol(poolTrade.baseAssetSymbol, nonce);
    Asset memory quoteAsset =
      assetRegistry.loadAssetBySymbol(poolTrade.quoteAssetSymbol, nonce);

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
}
