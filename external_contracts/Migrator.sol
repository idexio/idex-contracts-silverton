// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.6.12;

import {
  IDEXMigrator,
  ICustodian
} from '@idexio/idex-farm/contracts/IDEXMigrator.sol';

contract Migrator is IDEXMigrator {
  constructor(
    address _farm,
    address _oldFactory,
    ICustodian _custodian,
    uint256 _notBeforeBlock
  ) public IDEXMigrator(_farm, _oldFactory, _custodian, _notBeforeBlock) {}
}
