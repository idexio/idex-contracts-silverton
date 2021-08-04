// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { HybridTrade } from './Structs.sol';

library HybridTradeHelpers {
  /**
   * @dev Total fees paid by taker from received asset across orderbook and pool trades. Does not
   * include pool input fees nor pool output adjustment
   */
  function calculateTakerFeeQuantityInPips(HybridTrade memory self)
    internal
    pure
    returns (uint64)
  {
    return
      self.takerGasFeeQuantityInPips +
      self.orderBookTrade.takerFeeQuantityInPips;
  }

  /**
   * @dev Gross quantity received by taker
   */
  function calculateTakerGrossReceivedQuantityInPips(HybridTrade memory self)
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
}
