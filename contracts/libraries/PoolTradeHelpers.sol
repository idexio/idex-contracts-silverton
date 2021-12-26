// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { OrderSide } from './Enums.sol';
import { PoolTrade } from './Structs.sol';

library PoolTradeHelpers {
  /**
   * @dev Address of asset order wallet is receiving from pool
   */
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
   * @dev Address of asset order wallet is giving to pool
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

  /**
   * @dev Quantity in pips of asset that order wallet is receiving from pool
   */
  function calculateOrderCreditQuantityInPips(
    PoolTrade memory self,
    OrderSide orderSide
  ) internal pure returns (uint64) {
    return
      (
        orderSide == OrderSide.Buy
          ? self.netBaseQuantityInPips
          : self.netQuoteQuantityInPips
      ) - self.takerGasFeeQuantityInPips;
  }

  /**
   * @dev Quantity in pips of asset that order wallet is giving to pool
   */
  function getOrderDebitQuantityInPips(
    PoolTrade memory self,
    OrderSide orderSide
  ) internal pure returns (uint64) {
    return
      orderSide == OrderSide.Buy
        ? self.grossQuoteQuantityInPips
        : self.grossBaseQuantityInPips;
  }

  /**
   * @dev Quantity in pips of asset that pool receives from order wallet
   */
  function calculatePoolCreditQuantityInPips(
    PoolTrade memory self,
    OrderSide orderSide
  ) internal pure returns (uint64) {
    return
      (
        orderSide == OrderSide.Buy
          ? self.netQuoteQuantityInPips
          : self.netBaseQuantityInPips
      ) + self.takerPoolFeeQuantityInPips;
  }

  /**
   * @dev Quantity in pips of asset that leaves pool as output
   */
  function getPoolDebitQuantityInPips(
    PoolTrade memory self,
    OrderSide orderSide
  ) internal pure returns (uint64) {
    return (
      orderSide == OrderSide.Buy
        ? self.netBaseQuantityInPips // Pool gives net base asset plus taker gas fee
        : self.netQuoteQuantityInPips // Pool gives net quote asset plus taker gas fee
    );
  }

  /**
   * @dev Gross quantity received by order wallet
   */
  function getOrderGrossReceivedQuantityInPips(
    PoolTrade memory self,
    OrderSide orderSide
  ) internal pure returns (uint64) {
    return
      orderSide == OrderSide.Buy
        ? self.grossBaseQuantityInPips
        : self.grossQuoteQuantityInPips;
  }

  function calculatePoolOutputAdjustment(
    PoolTrade memory self,
    OrderSide orderSide
  ) internal pure returns (uint64) {
    return
      getOrderGrossReceivedQuantityInPips(self, orderSide) -
      getPoolDebitQuantityInPips(self, orderSide);
  }
}
