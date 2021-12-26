// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { IERC20 } from './Interfaces.sol';

/**
 * @notice This library provides helper utilities for transfering assets in and out of contracts.
 * It further validates ERC-20 compliant balance updates in the case of token assets
 */
library AssetTransfers {
  /**
   * @dev Transfers tokens from a wallet into a contract during deposits. `wallet` must already
   * have called `approve` on the token contract for at least `tokenQuantity`. Note this only
   * applies to tokens since ETH is sent in the deposit transaction via `msg.value`
   */
  function transferFrom(
    address wallet,
    IERC20 tokenAddress,
    address to,
    uint256 quantityInAssetUnits
  ) internal {
    uint256 balanceBefore = tokenAddress.balanceOf(to);

    // Because we check for the expected balance change we can safely ignore the return value of transferFrom
    tokenAddress.transferFrom(wallet, to, quantityInAssetUnits);

    uint256 balanceAfter = tokenAddress.balanceOf(to);
    require(
      balanceAfter - balanceBefore == quantityInAssetUnits,
      'Token contract returned transferFrom success without expected balance change'
    );
  }

  /**
   * @dev Transfers ETH or token assets from a contract to a wallet when withdrawing or removing liquidity
   */
  function transferTo(
    address payable walletOrContract,
    address asset,
    uint256 quantityInAssetUnits
  ) internal {
    if (asset == address(0x0)) {
      require(
        walletOrContract.send(quantityInAssetUnits),
        'ETH transfer failed'
      );
    } else {
      uint256 balanceBefore = IERC20(asset).balanceOf(walletOrContract);

      // Because we check for the expected balance change we can safely ignore the return value of transfer
      IERC20(asset).transfer(walletOrContract, quantityInAssetUnits);

      uint256 balanceAfter = IERC20(asset).balanceOf(walletOrContract);
      require(
        balanceAfter - balanceBefore == quantityInAssetUnits,
        'Token contract returned transfer success without expected balance change'
      );
    }
  }
}
