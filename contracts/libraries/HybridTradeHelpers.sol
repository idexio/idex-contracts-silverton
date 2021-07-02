// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { HybridTrade } from './Structs.sol';

library HybridTradeHelpers {
  /**
   * @dev Gross quantity received by maker
   */
  function makerGrossQuantityInPips(HybridTrade memory self)
    internal
    pure
    returns (uint64)
  {
    return
      self.orderBookTrade.takerFeeAssetAddress ==
        self.orderBookTrade.baseAssetAddress
        ? self.orderBookTrade.grossQuoteQuantityInPips
        : self.orderBookTrade.grossBaseQuantityInPips;
  }

  /**
   * @dev Gross quantity received by taker
   */
  function takerGrossQuantityInPips(HybridTrade memory self)
    internal
    pure
    returns (uint64)
  {
    return
      (
        self.orderBookTrade.takerFeeAssetAddress ==
          self.orderBookTrade.baseAssetAddress
          ? self.orderBookTrade.grossBaseQuantityInPips +
            self.poolTrade.grossBaseQuantityInPips
          : self.orderBookTrade.grossQuoteQuantityInPips +
            self.poolTrade.grossQuoteQuantityInPips
      ) + self.takerGasFeeQuantityInPips;
  }

  /**
   * @dev Net quantity received by maker
   */
  function makerNetQuantityInPips(HybridTrade memory self)
    internal
    pure
    returns (uint64)
  {
    return
      self.orderBookTrade.takerFeeAssetAddress ==
        self.orderBookTrade.baseAssetAddress
        ? self.orderBookTrade.netQuoteQuantityInPips
        : self.orderBookTrade.netBaseQuantityInPips;
  }

  /**
   * @dev Net quantity received by taker
   */
  function takerNetQuantityInPips(HybridTrade memory self)
    internal
    pure
    returns (uint64)
  {
    return
      self.orderBookTrade.takerFeeAssetAddress ==
        self.orderBookTrade.baseAssetAddress
        ? self.orderBookTrade.netBaseQuantityInPips +
          self.poolTrade.netBaseQuantityInPips
        : self.orderBookTrade.netQuoteQuantityInPips +
          self.poolTrade.netQuoteQuantityInPips;
  }
}
