// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

// The following imports are purely to generate Truffle artifacts and typings for test code
import {
  IPancakeFactory
} from '@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol';
import {
  IPancakePair
} from '@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol';

import { AssetTransfers } from '../libraries/AssetTransfers.sol';

interface ICustodianMock {
  receive() external payable;

  function withdraw(
    address payable wallet,
    address asset,
    uint256 quantityInAssetUnits
  ) external;
}

contract ExchangeWithdrawMock {
  ICustodianMock _custodian;

  receive() external payable {
    AssetTransfers.transferTo(payable(_custodian), address(0x0), msg.value);
  }

  function setCustodian(ICustodianMock newCustodian) external {
    _custodian = newCustodian;
  }

  function withdraw(
    address payable wallet,
    address asset,
    uint256 quantityInAssetUnits
  ) external {
    _custodian.withdraw(wallet, asset, quantityInAssetUnits);
  }
}
