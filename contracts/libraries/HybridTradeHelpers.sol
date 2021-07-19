// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { HybridTrade } from './Structs.sol';

library HybridTradeHelpers {
  /**
   * @dev Gross quantity received by maker
   */
  function getMakerGrossQuantityInPips(HybridTrade memory self)
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
  function calculateTakerGrossQuantityInPips(HybridTrade memory self)
    internal
    pure
    returns (uint64)
  {
    return (
      self.orderBookTrade.takerFeeAssetAddress ==
        self.orderBookTrade.baseAssetAddress
        ? self.orderBookTrade.grossBaseQuantityInPips +
          self.poolTrade.grossBaseQuantityInPips
        : self.orderBookTrade.grossQuoteQuantityInPips +
          self.poolTrade.grossQuoteQuantityInPips
    );
  }

  /**
   * @dev Net quantity received by maker
   */
  function getMakerNetQuantityInPips(HybridTrade memory self)
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
  function calculateTakerNetQuantityInPips(HybridTrade memory self)
    internal
    pure
    returns (uint64)
  {
    return
      (
        self.orderBookTrade.takerFeeAssetAddress ==
          self.orderBookTrade.baseAssetAddress
          ? self.orderBookTrade.netBaseQuantityInPips +
            self.poolTrade.netBaseQuantityInPips
          : self.orderBookTrade.netQuoteQuantityInPips +
            self.poolTrade.netQuoteQuantityInPips
      ) - self.takerGasFeeQuantityInPips;
  }
}
