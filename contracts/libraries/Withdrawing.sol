// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import {
  IPair
} from '@idexio/pancake-swap-core/contracts/interfaces/IPair.sol';

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { Validations } from './Validations.sol';
import { UUID } from './UUID.sol';
import { Enums, ICustodian, Structs } from './Interfaces.sol';

library Withdrawing {
  using AssetRegistry for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;

  uint64 constant _maxWithdrawalFeeBasisPoints = 20 * 100; // 20%;

  function withdraw(
    Structs.Withdrawal memory withdrawal,
    ICustodian custodian,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking,
    mapping(bytes32 => bool) storage completedWithdrawalHashes
  )
    public
    returns (
      uint64 newExchangeBalanceInPips,
      uint256 newExchangeBalanceInAssetUnits
    )
  {
    // Validations
    require(
      Validations.getFeeBasisPoints(
        withdrawal.gasFeeInPips,
        withdrawal.quantityInPips
      ) <= _maxWithdrawalFeeBasisPoints,
      'Excessive withdrawal fee'
    );
    bytes32 withdrawalHash =
      Validations.validateWithdrawalSignature(withdrawal);
    require(
      !completedWithdrawalHashes[withdrawalHash],
      'Hash already withdrawn'
    );

    // If withdrawal is by asset symbol (most common) then resolve to asset address
    Structs.Asset memory asset =
      withdrawal.withdrawalType == Enums.WithdrawalType.BySymbol
        ? assetRegistry.loadAssetBySymbol(
          withdrawal.assetSymbol,
          UUID.getTimestampInMsFromUuidV1(withdrawal.nonce)
        )
        : assetRegistry.loadAssetByAddress(withdrawal.assetAddress);

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
        withdrawal.quantityInPips - withdrawal.gasFeeInPips,
        asset.decimals
      );
    custodian.withdraw(
      withdrawal.walletAddress,
      asset.assetAddress,
      netAssetQuantityInAssetUnits
    );

    completedWithdrawalHashes[withdrawalHash] = true;
  }

  function withdrawLiquidity(
    Structs.LiquidityRemoval memory removal,
    Structs.LiquidityChangeExecution memory execution,
    ICustodian custodian,
    address exchangeAddress,
    address feeWallet,
    IPair pairTokenAddress,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) internal {
    (
      uint256 outputBaseAssetQuantityInAssetUnits,
      uint256 outputQuoteAssetQuantityInAssetUnits
    ) =
      balanceTracking.updateForRemoveLiquidity(
        removal,
        execution,
        feeWallet,
        exchangeAddress,
        pairTokenAddress,
        assetRegistry
      );

    if (outputBaseAssetQuantityInAssetUnits > 0) {
      custodian.withdraw(
        removal.to,
        execution.baseAssetAddress,
        outputBaseAssetQuantityInAssetUnits
      );
    }
    if (outputQuoteAssetQuantityInAssetUnits > 0) {
      custodian.withdraw(
        removal.to,
        execution.quoteAssetAddress,
        outputQuoteAssetQuantityInAssetUnits
      );
    }
  }
}
