// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { AssetTransfers } from '../libraries/AssetTransfers.sol';
import { ILiquidityProviderToken } from '../libraries/Interfaces.sol';
import { LiquidityPool } from '../libraries/Structs.sol';
import { LiquidityPools } from '../libraries/LiquidityPools.sol';

contract BalanceMigrationSourceMock {
  mapping(address => mapping(address => uint64)) _balancesInPips;
  uint64 public _depositIndex;

  constructor(uint64 depositIndex) {
    _depositIndex = depositIndex;
  }

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
