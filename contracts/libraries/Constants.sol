// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

library Constants {
  // 100 basis points/percent * 100 percent/total
  uint64 public constant basisPointsInTotal = 100 * 100;

  // 1 week at 15s/block
  uint256 public constant maxChainPropagationPeriod = (7 * 24 * 60 * 60) / 3;

  // 20%
  uint64 public constant maxTradeFeeBasisPoints = 20 * 100;

  // https://github.com/idexio/idex-swap-core/blob/master/contracts/IDEXERC20.sol#L11
  uint8 public constant pairTokenDecimals = 18;

  uint8 public constant signatureHashVersion = 2;
}
