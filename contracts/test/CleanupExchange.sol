// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { AssetTransfers } from '../libraries/AssetTransfers.sol';

interface IExchangeWithCleanup {
  function cleanupWalletBalance(address wallet, address assetAddress) external;
}

contract CleanupExchange {
  IExchangeWithCleanup _exchange;

  constructor(IExchangeWithCleanup exchangeWithCleanup) {
    _exchange = exchangeWithCleanup;
  }

  function cleanup(address wallet, address assetAddress) external {
    _exchange.cleanupWalletBalance(wallet, assetAddress);
  }
}
