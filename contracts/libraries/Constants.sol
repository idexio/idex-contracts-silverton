// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

library Constants {
  // 100 basis points/percent * 100 percent/total
  uint64 public constant basisPointsInTotal = 100 * 100;

  // 1 week at 3s/block
  uint256 public constant maxChainPropagationPeriod = (7 * 24 * 60 * 60) / 3;

  // 20%
  uint64 public constant maxTradeFeeBasisPoints = 20 * 100;

  // 20%
  uint64 public constant maxWithdrawalFeeBasisPoints = 20 * 100;

  uint8 public constant liquidityProviderTokenDecimals = 18;

  uint8 public constant signatureHashVersion = 2;
}
