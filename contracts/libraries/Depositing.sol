// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import {
  IIDEXFactory
} from '@idexio/idex-swap-core/contracts/interfaces/IIDEXFactory.sol';
import {
  IIDEXPair
} from '@idexio/idex-swap-core/contracts/interfaces/IIDEXPair.sol';

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetTransfers } from './AssetTransfers.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { ICustodian, IERC20 } from './Interfaces.sol';
import { Asset } from './Structs.sol';

library Depositing {
  using AssetRegistry for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;

  /**
   * @dev delegatecall entry point for `Exchange` when depositing native or token assets
   */
  function deposit(
    address wallet,
    Asset memory asset,
    uint256 quantityInAssetUnits,
    ICustodian custodian,
    BalanceTracking.Storage storage balanceTracking
  )
    public
    returns (
      uint64 quantityInPips,
      uint64 newExchangeBalanceInPips,
      uint256 newExchangeBalanceInAssetUnits
    )
  {
    return
      depositAsset(
        wallet,
        asset,
        quantityInAssetUnits,
        custodian,
        balanceTracking
      );
  }

  function depositLiquidityReserves(
    address wallet,
    address assetA,
    address assetB,
    uint256 quantityAInAssetUnits,
    uint256 quantityBInAssetUnits,
    ICustodian custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) internal {
    Asset memory asset;

    asset = assetRegistry.loadAssetByAddress(assetA);
    depositAsset(
      wallet,
      asset,
      quantityAInAssetUnits,
      custodian,
      balanceTracking
    );

    asset = assetRegistry.loadAssetByAddress(assetB);
    depositAsset(
      wallet,
      asset,
      quantityBInAssetUnits,
      custodian,
      balanceTracking
    );
  }

  function depositLiquidityTokens(
    address wallet,
    address assetA,
    address assetB,
    uint256 quantityInAssetUnits,
    ICustodian custodian,
    IIDEXFactory pairFactoryAddress,
    address WETH,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) internal {
    address pairTokenAddress =
      pairFactoryAddress.getPair(
        assetA == address(0x0) ? address(WETH) : assetA,
        assetB == address(0x0) ? address(WETH) : assetB
      );

    Asset memory asset = assetRegistry.loadAssetByAddress(pairTokenAddress);

    depositAsset(
      wallet,
      asset,
      quantityInAssetUnits,
      custodian,
      balanceTracking
    );
  }

  function depositAsset(
    address wallet,
    Asset memory asset,
    uint256 quantityInAssetUnits,
    ICustodian custodian,
    BalanceTracking.Storage storage balanceTracking
  )
    internal
    returns (
      uint64 quantityInPips,
      uint64 newExchangeBalanceInPips,
      uint256 newExchangeBalanceInAssetUnits
    )
  {
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      quantityInAssetUnits,
      asset.decimals
    );
    require(quantityInPips > 0, 'Quantity is too low');

    // Convert from pips back into asset units to remove any fractional amount that is too small
    // to express in pips. If the asset is ETH, this leftover fractional amount accumulates as dust
    // in the `Exchange` contract. If the asset is a token the `Exchange` will call `transferFrom`
    // without this fractional amount and there will be no dust
    uint256 quantityInAssetUnitsWithoutFractionalPips =
      AssetUnitConversions.pipsToAssetUnits(quantityInPips, asset.decimals);

    // Forward the funds to the `Custodian`
    if (asset.assetAddress == address(0x0)) {
      // If the asset is ETH then the funds were already assigned to the `Exchange` via msg.value.
      AssetTransfers.transferTo(
        payable(address(custodian)),
        asset.assetAddress,
        quantityInAssetUnitsWithoutFractionalPips
      );
    } else {
      // If the asset is a token,  call the transferFrom function on the token contract for the
      // pre-approved asset quantity
      AssetTransfers.transferFrom(
        wallet,
        IERC20(asset.assetAddress),
        payable(address(custodian)),
        quantityInAssetUnitsWithoutFractionalPips
      );
    }

    // Update balance with actual transferred quantity
    newExchangeBalanceInPips = balanceTracking.updateForDeposit(
      wallet,
      asset.assetAddress,
      quantityInPips
    );
    newExchangeBalanceInAssetUnits = AssetUnitConversions.pipsToAssetUnits(
      newExchangeBalanceInPips,
      asset.decimals
    );
  }
}
