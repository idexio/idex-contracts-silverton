// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { Constants } from './Constants.sol';
import { UUID } from './UUID.sol';
import { Validations } from './Validations.sol';
import { WithdrawalType } from './Enums.sol';
import {
  Asset,
  LiquidityChangeExecution,
  LiquidityRemoval,
  Withdrawal
} from './Structs.sol';
import { ICustodian, ILiquidityProviderToken } from './Interfaces.sol';

library Withdrawing {
  using AssetRegistry for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;

  function withdraw(
    Withdrawal memory withdrawal,
    ICustodian custodian,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking,
    mapping(bytes32 => bool) storage completedWithdrawalHashes
  )
    public
    returns (
      uint64 newExchangeBalanceInPips,
      uint256 newExchangeBalanceInAssetUnits,
      address assetAddress,
      string memory assetSymbol
    )
  {
    // Validations
    require(
      Validations.isFeeQuantityValid(
        withdrawal.gasFeeInPips,
        withdrawal.grossQuantityInPips,
        Constants.maxFeeBasisPoints
      ),
      'Excessive withdrawal fee'
    );
    bytes32 withdrawalHash =
      Validations.validateWithdrawalSignature(withdrawal);
    require(
      !completedWithdrawalHashes[withdrawalHash],
      'Hash already withdrawn'
    );

    // If withdrawal is by asset symbol (most common) then resolve to asset address
    Asset memory asset =
      withdrawal.withdrawalType == WithdrawalType.BySymbol
        ? assetRegistry.loadAssetBySymbol(
          withdrawal.assetSymbol,
          UUID.getTimestampInMsFromUuidV1(withdrawal.nonce)
        )
        : assetRegistry.loadAssetByAddress(withdrawal.assetAddress);

    assetSymbol = asset.symbol;
    assetAddress = asset.assetAddress;

    // Update wallet balances
    newExchangeBalanceInPips = balanceTracking.updateForWithdrawal(
      withdrawal,
      asset.assetAddress,
      feeWallet
    );
    newExchangeBalanceInAssetUnits = AssetUnitConversions.pipsToAssetUnits(
      newExchangeBalanceInPips,
      asset.decimals
    );

    // Transfer funds from Custodian to wallet
    uint256 netAssetQuantityInAssetUnits =
      AssetUnitConversions.pipsToAssetUnits(
        withdrawal.grossQuantityInPips - withdrawal.gasFeeInPips,
        asset.decimals
      );
    custodian.withdraw(
      withdrawal.walletAddress,
      asset.assetAddress,
      netAssetQuantityInAssetUnits
    );

    // Replay prevention
    completedWithdrawalHashes[withdrawalHash] = true;
  }

  function withdrawExit(
    address assetAddress,
    ICustodian custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) external returns (uint64 previousExchangeBalanceInPips) {
    // Update wallet balance
    previousExchangeBalanceInPips = balanceTracking.updateForExit(
      msg.sender,
      assetAddress
    );

    // Transfer asset from Custodian to wallet
    Asset memory asset = assetRegistry.loadAssetByAddress(assetAddress);
    uint256 balanceInAssetUnits =
      AssetUnitConversions.pipsToAssetUnits(
        previousExchangeBalanceInPips,
        asset.decimals
      );
    ICustodian(custodian).withdraw(
      payable(msg.sender),
      assetAddress,
      balanceInAssetUnits
    );
  }

  function withdrawLiquidity(
    LiquidityRemoval memory removal,
    LiquidityChangeExecution memory execution,
    ICustodian custodian,
    address feeWallet,
    ILiquidityProviderToken liquidityProviderToken,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) internal {
    (
      uint64 outputBaseAssetQuantityInPips,
      uint64 outputQuoteAssetQuantityInPips
    ) =
      balanceTracking.updateForRemoveLiquidity(
        removal,
        execution,
        feeWallet,
        address(custodian),
        liquidityProviderToken
      );

    Asset memory asset;
    if (outputBaseAssetQuantityInPips > 0) {
      asset = assetRegistry.loadAssetByAddress(execution.baseAssetAddress);
      custodian.withdraw(
        removal.to,
        execution.baseAssetAddress,
        AssetUnitConversions.pipsToAssetUnits(
          outputBaseAssetQuantityInPips,
          asset.decimals
        )
      );
    }
    if (outputQuoteAssetQuantityInPips > 0) {
      asset = assetRegistry.loadAssetByAddress(execution.quoteAssetAddress);
      custodian.withdraw(
        removal.to,
        execution.quoteAssetAddress,
        AssetUnitConversions.pipsToAssetUnits(
          outputQuoteAssetQuantityInPips,
          asset.decimals
        )
      );
    }
  }
}
