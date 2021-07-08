// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { LiquidityChangeExecution } from './Structs.sol';

library LiquidityChangeExecutionHelpers {
  /**
   * @dev Quantity in pips of gross base quantity sent to fee wallet
   */
  function calculateBaseFeeQuantityInPips(LiquidityChangeExecution memory self)
    internal
    pure
    returns (uint64)
  {
    return self.grossBaseQuantityInPips - self.netBaseQuantityInPips;
  }

  /**
   * @dev Quantity in pips of gross quote quantity sent to fee wallet
   */
  function calculateQuoteFeeQuantityInPips(LiquidityChangeExecution memory self)
    internal
    pure
    returns (uint64)
  {
    return self.grossQuoteQuantityInPips - self.netQuoteQuantityInPips;
  }
}
