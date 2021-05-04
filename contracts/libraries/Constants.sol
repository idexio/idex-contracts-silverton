// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

library Constants {
  // 1 week at 15s/block
  uint256 constant maxChainPropagationPeriod = (7 * 24 * 60 * 60) / 15;

  // https://github.com/idexio/pancake-swap-core/blob/master/contracts/ERC20.sol#L11
  uint8 public constant pairTokenDecimals = 18;

  // 100 basis points/percent * 100 percent/total
  uint64 public constant basisPointsInTotal = 100 * 100;

  // 20%
  uint64 public constant maxTradeFeeBasisPoints = 20 * 100;
}
