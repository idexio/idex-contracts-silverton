// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { AssetTransfers } from '../libraries/AssetTransfers.sol';

interface IGovernanceMockCustodian {
  receive() external payable;

  function setExchange(address exchange) external;

  function setGovernance(address governance) external;
}

contract GovernanceMock {
  IGovernanceMockCustodian _custodian;

  function setCustodian(IGovernanceMockCustodian newCustodian) external {
    _custodian = newCustodian;
  }

  function setExchange(address newExchange) external {
    _custodian.setExchange(newExchange);
  }

  function setGovernance(address newGovernance) external {
    _custodian.setGovernance(newGovernance);
  }
}
