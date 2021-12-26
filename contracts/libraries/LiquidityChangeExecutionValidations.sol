// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { Constants } from './Constants.sol';
import { IERC20 } from './Interfaces.sol';
import {
  LiquidityChangeExecutionHelpers
} from './LiquidityChangeExecutionHelpers.sol';
import { LiquidityPoolHelpers } from './LiquidityPoolHelpers.sol';
import { Validations } from './Validations.sol';
import {
  LiquidityAddition,
  LiquidityChangeExecution,
  LiquidityPool,
  LiquidityRemoval
} from './Structs.sol';

library LiquidityChangeExecutionValidations {
  using LiquidityChangeExecutionHelpers for LiquidityChangeExecution;
  using LiquidityPoolHelpers for LiquidityPool;

  function validateLiquidityAddition(
    LiquidityAddition memory addition,
    LiquidityChangeExecution memory execution,
    LiquidityPool memory pool
  ) internal view {
    require(
      ((execution.baseAssetAddress == addition.assetA &&
        execution.quoteAssetAddress == addition.assetB) ||
        (execution.baseAssetAddress == addition.assetB &&
          execution.quoteAssetAddress == addition.assetA)),
      'Asset address mismatch'
    );

    (
      uint256 minBaseInAssetUnits,
      uint256 desiredBaseInAssetUnits,
      uint256 minQuoteInAssetUnits,
      uint256 desiredQuoteInAssetUnits
    ) =
      execution.baseAssetAddress == addition.assetA
        ? (
          addition.amountAMin,
          addition.amountADesired,
          addition.amountBMin,
          addition.amountBDesired
        )
        : (
          addition.amountBMin,
          addition.amountBDesired,
          addition.amountAMin,
          addition.amountADesired
        );
    (uint64 minBase, uint64 maxBase, uint64 minQuote, uint64 maxQuote) =
      (
        AssetUnitConversions.assetUnitsToPips(
          minBaseInAssetUnits,
          pool.baseAssetDecimals
        ),
        AssetUnitConversions.assetUnitsToPips(
          desiredBaseInAssetUnits,
          pool.baseAssetDecimals
        ),
        AssetUnitConversions.assetUnitsToPips(
          minQuoteInAssetUnits,
          pool.quoteAssetDecimals
        ),
        AssetUnitConversions.assetUnitsToPips(
          desiredQuoteInAssetUnits,
          pool.quoteAssetDecimals
        )
      );

    require(
      execution.grossBaseQuantityInPips >= minBase,
      'Min base quantity not met'
    );
    require(
      execution.grossBaseQuantityInPips <= maxBase,
      'Desired base quantity exceeded'
    );
    require(
      execution.grossQuoteQuantityInPips >= minQuote,
      'Min quote quantity not met'
    );
    require(
      execution.grossQuoteQuantityInPips <= maxQuote,
      'Desired quote quantity exceeded'
    );

    require(
      execution.liquidityInPips > 0 &&
        execution.liquidityInPips ==
        pool.calculateOutputLiquidityInPips(
          execution.netBaseQuantityInPips,
          execution.netQuoteQuantityInPips
        ),
      'Invalid liquidity minted'
    );

    validateLiquidityChangeExecutionFees(execution);
  }

  function validateLiquidityRemoval(
    LiquidityRemoval memory removal,
    LiquidityChangeExecution memory execution,
    LiquidityPool memory pool
  ) internal view {
    require(
      ((execution.baseAssetAddress == removal.assetA &&
        execution.quoteAssetAddress == removal.assetB) ||
        (execution.baseAssetAddress == removal.assetB &&
          execution.quoteAssetAddress == removal.assetA)),
      'Asset address mismatch'
    );

    require(
      execution.grossBaseQuantityInPips > 0 &&
        execution.grossQuoteQuantityInPips > 0,
      'Gross quantities must be nonzero'
    );

    (uint256 minBaseInAssetUnits, uint256 minQuoteInAssetUnits) =
      execution.baseAssetAddress == removal.assetA
        ? (removal.amountAMin, removal.amountBMin)
        : (removal.amountBMin, removal.amountAMin);
    (uint64 minBase, uint64 minQuote) =
      (
        AssetUnitConversions.assetUnitsToPips(
          minBaseInAssetUnits,
          pool.baseAssetDecimals
        ),
        AssetUnitConversions.assetUnitsToPips(
          minQuoteInAssetUnits,
          pool.quoteAssetDecimals
        )
      );

    require(
      execution.grossBaseQuantityInPips >= minBase,
      'Min base quantity not met'
    );
    require(
      execution.grossQuoteQuantityInPips >= minQuote,
      'Min quote quantity not met'
    );

    require(
      execution.liquidityInPips ==
        AssetUnitConversions.assetUnitsToPips(
          removal.liquidity,
          Constants.liquidityProviderTokenDecimals
        ),
      'Invalid liquidity burned'
    );

    (uint256 expectedBaseAssetQuantityInPips, ) =
      pool.calculateOutputAssetQuantitiesInPips(execution.liquidityInPips);

    // To allow for integer rounding precision loss, only validate exact output quantity for the
    // base asset, and allow the invariant price check performed in
    // validateAndUpdateForLiquidityRemoval to indirectly validate the output quantity of the quote
    // asset
    require(
      execution.grossBaseQuantityInPips == expectedBaseAssetQuantityInPips,
      'Invalid base quantity'
    );

    validateLiquidityChangeExecutionFees(execution);
  }

  function validateLiquidityChangeExecutionFees(
    LiquidityChangeExecution memory execution
  ) private pure {
    require(
      Validations.isFeeQuantityValid(
        execution.calculateBaseFeeQuantityInPips(),
        execution.grossBaseQuantityInPips,
        Constants.maxFeeBasisPoints
      ),
      'Excessive base fee'
    );
    require(
      Validations.isFeeQuantityValid(
        execution.calculateQuoteFeeQuantityInPips(),
        execution.grossQuoteQuantityInPips,
        Constants.maxFeeBasisPoints
      ),
      'Excessive quote fee'
    );
  }
}
