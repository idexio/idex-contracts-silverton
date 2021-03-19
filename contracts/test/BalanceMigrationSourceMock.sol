// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { AssetTransfers } from '../libraries/AssetTransfers.sol';

interface ICustodian {
    receive() external payable;

    function withdraw(
        address payable wallet,
        address asset,
        uint256 quantityInAssetUnits
    ) external;
}

contract BalanceMigrationSourceMock {
    mapping(address => mapping(address => uint64)) _balancesInPips;

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
