// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { Math } from '../libraries/Math.sol';

contract MathMock {
  function sqrt(uint256 y) external pure returns (uint256 z) {
    return Math.sqrt(y);
  }
}
