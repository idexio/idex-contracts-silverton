// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity =0.5.16;

import {
  PancakeFactory
} from '@pancakeswap-libs/pancake-swap-core/contracts/PancakeFactory.sol';

contract Factory is PancakeFactory {
  constructor(address _feeToSetter) public PancakeFactory(_feeToSetter) {}
}
