// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetTransfers } from './AssetTransfers.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { IERC20, Structs } from './Interfaces.sol';

library Depositing {
  using AssetRegistry for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;

  function deposit(
    address wallet,
    address assetAddress,
    uint256 quantityInAssetUnits,
    address custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  )
    public
    returns (
      uint64 quantityInPips,
      uint64 newExchangeBalanceInPips,
      uint256 newExchangeBalanceInAssetUnits,
      string memory assetSymbol
    )
  {
    Structs.Asset memory asset = assetRegistry.loadAssetByAddress(assetAddress);
    assetSymbol = asset.symbol;
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      quantityInAssetUnits,
      asset.decimals
    );
    require(quantityInPips > 0, 'Quantity is too low');

    // Convert from pips back into asset units to remove any fractional amount that is too small
    // to express in pips. If the asset is BNB, this leftover fractional amount accumulates as dust
    // in the `Exchange` contract. If the asset is a token the `Exchange` will call `transferFrom`
    // without this fractional amount and there will be no dust
    uint256 quantityInAssetUnitsWithoutFractionalPips =
      AssetUnitConversions.pipsToAssetUnits(quantityInPips, asset.decimals);

    // If the asset is BNB then the funds were already assigned to this contract via msg.value. If
    // the asset is a token, additionally call the transferFrom function on the token contract for
    // the pre-approved asset quantity
    if (assetAddress != address(0x0)) {
      AssetTransfers.transferFrom(
        wallet,
        IERC20(assetAddress),
        custodian,
        quantityInAssetUnitsWithoutFractionalPips
      );
    }

    // Update balance with actual transferred quantity
    newExchangeBalanceInPips = balanceTracking.updateForDeposit(
      wallet,
      assetAddress,
      quantityInPips
    );
    newExchangeBalanceInAssetUnits = AssetUnitConversions.pipsToAssetUnits(
      newExchangeBalanceInPips,
      asset.decimals
    );
  }
}
