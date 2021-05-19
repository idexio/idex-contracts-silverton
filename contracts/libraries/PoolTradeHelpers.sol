// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { OrderSide } from './Enums.sol';
import { PoolTrade } from './Structs.sol';

library PoolTradeHelpers {
  /**
   * @dev Address of asset order wallet is receiving from pool
   */
  function orderCreditAssetAddress(PoolTrade memory self, OrderSide orderSide)
    internal
    pure
    returns (address)
  {
    return
      orderSide == OrderSide.Buy
        ? self.baseAssetAddress
        : self.quoteAssetAddress;
  }

  /**
   * @dev Address of asset order wallet is giving to pool
   */
  function orderDebitAssetAddress(PoolTrade memory self, OrderSide orderSide)
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
   * @dev Quantity in pips of credit asset that order wallet is receiving from pool
   */
  function orderCreditQuantityInPips(PoolTrade memory self, OrderSide orderSide)
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

  /**
   * @dev Quantity in pips of debit asset that order wallet is giving to pool
   */
  function orderDebitQuantityInPips(PoolTrade memory self, OrderSide orderSide)
    internal
    pure
    returns (uint64)
  {
    return
      orderSide == OrderSide.Buy
        ? self.grossQuoteQuantityInPips
        : self.grossBaseQuantityInPips;
  }

  /**
   * @dev Quantity in pips of debit asset that pool receives from order wallet
   */
  function poolCreditQuantityInPips(PoolTrade memory self, OrderSide orderSide)
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

  /**
   * @dev Quantity in pips of credit asset that pool gives to order wallet
   */
  function poolDebitQuantityInPips(PoolTrade memory self, OrderSide orderSide)
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

  /**
   * @dev Fee quantity in pips on debit asset that order wallet gives to pool
   */
  function totalInputFeeQuantityInPips(PoolTrade memory self)
    internal
    pure
    returns (uint64)
  {
    return
      self.takerPoolFeeQuantityInPips + self.takerPoolProtocolFeeQuantityInPips;
  }
}
