// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { Enums, Structs } from './Interfaces.sol';

library PoolTradeHelpers {
  function getOrderCreditAssetAddress(
    Structs.PoolTrade memory self,
    Enums.OrderSide orderSide
  ) internal pure returns (address) {
    return
      orderSide == Enums.OrderSide.Buy
        ? self.baseAssetAddress
        : self.quoteAssetAddress;
  }

  function getOrderDebitAssetAddress(
    Structs.PoolTrade memory self,
    Enums.OrderSide orderSide
  ) internal pure returns (address) {
    return
      orderSide == Enums.OrderSide.Buy
        ? self.quoteAssetAddress
        : self.baseAssetAddress;
  }

  function getOrderCreditQuantity(
    Structs.PoolTrade memory self,
    Enums.OrderSide orderSide
  ) internal pure returns (uint64) {
    return
      (
        orderSide == Enums.OrderSide.Buy
          ? self.grossBaseQuantityInPips
          : self.grossQuoteQuantityInPips
      ) - self.takerGasFeeQuantityInPips;
  }

  function getOrderDebitQuantity(
    Structs.PoolTrade memory self,
    Enums.OrderSide orderSide
  ) internal pure returns (uint64) {
    return
      orderSide == Enums.OrderSide.Buy
        ? self.grossQuoteQuantityInPips
        : self.grossBaseQuantityInPips;
  }
}
