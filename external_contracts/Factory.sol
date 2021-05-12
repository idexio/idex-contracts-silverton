// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity =0.5.16;

import {
  IIDEXCustodian
} from '@idexio/idex-swap-core/contracts/interfaces/IIDEXCustodian.sol';
import { IDEXFactory } from '@idexio/idex-swap-core/contracts/IDEXFactory.sol';

contract Factory is IDEXFactory {
  constructor(address _feeToSetter, IIDEXCustodian _custodian)
    public
    IDEXFactory(_feeToSetter, _custodian)
  {}
}
