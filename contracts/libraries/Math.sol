// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

library Math {
  function multiplyPipsByFraction(
    uint64 multiplicand,
    uint64 dividend,
    uint64 divisor
  ) internal pure returns (uint64) {
    uint256 result = (uint256(multiplicand) * dividend) / divisor;
    require(result < 2**64, 'Pip quantity overflows uint64');

    return uint64(result);
  }

  function min(uint64 x, uint64 y) internal pure returns (uint64 z) {
    z = x < y ? x : y;
  }

  function sqrt(uint64 y) internal pure returns (uint64 z) {
    if (y > 3) {
      z = y;
      uint64 x = y / 2 + 1;
      while (x < z) {
        z = x;
        x = (y / x + x) / 2;
      }
    } else if (y != 0) {
      z = 1;
    }
  }
}
