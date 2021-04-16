// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity =0.5.16;

import {
  ICustodian
} from '@idexio/pancake-swap-core/contracts/interfaces/ICustodian.sol';
import { Factory } from '@idexio/pancake-swap-core/contracts/Factory.sol';

contract TestFactory is Factory {
  constructor(address _feeToSetter, ICustodian _custodian)
    public
    Factory(_feeToSetter, _custodian)
  {}
}
