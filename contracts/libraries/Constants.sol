// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

library Constants {
  // 100 basis points/percent * 100 percent/total
  uint64 public constant basisPointsInTotal = 100 * 100;

  uint64 public constant depositIndexNotSet = 2**64 - 1;

  uint8 public constant liquidityProviderTokenDecimals = 18;

  // 1 week at 3s/block
  uint256 public constant maxChainPropagationPeriod = (7 * 24 * 60 * 60) / 3;

  // 20%
  uint64 public constant maxFeeBasisPoints = 20 * 100;

  // Pool reserve balance ratio above which price dips below 1 pip and can no longer be represented
  uint64 public constant maxLiquidityPoolReserveRatio = 10**8;

  // Pool reserve balance below which prices can no longer be represented with full pip precision
  uint64 public constant minLiquidityPoolReserveInPips = 10**8;

  // 1%
  uint64 public constant maxPoolInputFeeBasisPoints = 2 * 100;

  // 5%
  uint64 public constant maxPoolOutputAdjustmentBasisPoints = 5 * 100;

  // 1%
  uint64 public constant maxPoolPriceCorrectionBasisPoints = 1 * 100;

  // To convert integer pips to a fractional price shift decimal left by the pip precision of 8
  // decimals places
  uint64 public constant pipPriceMultiplier = 10**8;

  uint8 public constant signatureHashVersion = 3;
}
