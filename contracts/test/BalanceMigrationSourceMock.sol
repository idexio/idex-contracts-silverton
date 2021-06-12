// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetTransfers } from '../libraries/AssetTransfers.sol';

contract BalanceMigrationSourceMock {
  mapping(address => mapping(address => uint64)) _balancesInPips;

  constructor() {}

  function setBalanceInPipsByAddress(
    address wallet,
    address assetAddress,
    uint64 balanceInPips
  ) external {
    _balancesInPips[wallet][assetAddress] = balanceInPips;
  }

  function loadBalanceInPipsByAddress(address wallet, address assetAddress)
    external
    view
    returns (uint64)
  {
    return _balancesInPips[wallet][assetAddress];
  }
}
