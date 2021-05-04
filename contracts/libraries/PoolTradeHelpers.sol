// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { OrderSide } from './Enums.sol';
import { PoolTrade } from './Structs.sol';

library PoolTradeHelpers {
  function getOrderCreditAssetAddress(
    PoolTrade memory self,
    OrderSide orderSide
  ) internal pure returns (address) {
    return
      orderSide == OrderSide.Buy
        ? self.baseAssetAddress
        : self.quoteAssetAddress;
  }

  function getOrderDebitAssetAddress(PoolTrade memory self, OrderSide orderSide)
    internal
    pure
    returns (address)
  {
    return
      orderSide == OrderSide.Buy
        ? self.quoteAssetAddress
        : self.baseAssetAddress;
  }

  function getOrderCreditQuantity(PoolTrade memory self, OrderSide orderSide)
    internal
    pure
    returns (uint64)
  {
    return
      (
        orderSide == OrderSide.Buy
          ? self.grossBaseQuantityInPips
          : self.grossQuoteQuantityInPips
      ) - self.takerGasFeeQuantityInPips;
  }

  function getOrderDebitQuantity(PoolTrade memory self, OrderSide orderSide)
    internal
    pure
    returns (uint64)
  {
    return
      orderSide == OrderSide.Buy
        ? self.grossQuoteQuantityInPips
        : self.grossBaseQuantityInPips;
  }
}
