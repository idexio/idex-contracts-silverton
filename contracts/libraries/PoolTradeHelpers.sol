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

  /**
   * @dev Address of asset wallet is giving to pool
   */
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
          ? self.netBaseQuantityInPips
          : self.netQuoteQuantityInPips
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

  function getPoolCreditQuantity(PoolTrade memory self, OrderSide orderSide)
    internal
    pure
    returns (uint64)
  {
    return
      (
        orderSide == OrderSide.Buy
          ? self.grossQuoteQuantityInPips // Pool receives gross quote asset minus protocol fee
          : self.grossBaseQuantityInPips // Pool receives gross base asset minus protocol fee
      ) - self.takerPoolProtocolFeeQuantityInPips;
  }

  function getPoolDebitQuantity(PoolTrade memory self, OrderSide orderSide)
    internal
    pure
    returns (uint64)
  {
    return
      (
        orderSide == OrderSide.Buy
          ? self.netBaseQuantityInPips // Pool gives net base asset plus taker gas fee
          : self.netQuoteQuantityInPips // Pool gives net quote asset plus taker gas fee
      ) + self.takerGasFeeQuantityInPips;
  }

  function getTotalInputFeeQuantity(PoolTrade memory self)
    internal
    pure
    returns (uint64)
  {
    return
      self.takerPoolFeeQuantityInPips + self.takerPoolProtocolFeeQuantityInPips;
  }
}
