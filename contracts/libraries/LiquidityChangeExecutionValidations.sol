// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { Constants } from './Constants.sol';
import { IERC20 } from './Interfaces.sol';
import {
  LiquidityChangeExecutionHelpers
} from './LiquidityChangeExecutionHelpers.sol';
import { Validations } from './Validations.sol';
import {
  LiquidityAddition,
  LiquidityChangeExecution,
  LiquidityPool,
  LiquidityRemoval
} from './Structs.sol';

library LiquidityChangeExecutionValidations {
  using LiquidityChangeExecutionHelpers for LiquidityChangeExecution;

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
        calculateOutputLiquidityInPips(
          pool,
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
      'Insufficient liquidity burned'
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

    (
      uint256 expectedBaseAssetQuantityInPips,
      uint256 expectedQuoteAssetQuantityInPips
    ) = calculateOutputAssetQuantitiesInPips(pool, execution.liquidityInPips);

    require(
      execution.grossBaseQuantityInPips == expectedBaseAssetQuantityInPips,
      'Invalid base quantity'
    );
    require(
      execution.grossQuoteQuantityInPips == expectedQuoteAssetQuantityInPips,
      'Invalid quote quantity'
    );

    validateLiquidityChangeExecutionFees(execution);
  }

  function validateLiquidityChangeExecutionFees(
    LiquidityChangeExecution memory execution
  ) private pure {
    require(
      Validations.isFeeQuantityValid(
        execution.calculateBaseFeeQuantityInPips(),
        execution.grossBaseQuantityInPips
      ),
      'Excessive base fee'
    );
    require(
      Validations.isFeeQuantityValid(
        execution.calculateQuoteFeeQuantityInPips(),
        execution.grossQuoteQuantityInPips
      ),
      'Excessive quote fee'
    );
  }

  // Utils //

  /**
   * @dev Calculate reserve asset quantities to remove from a pool for a given liquidity amount
   */
  function calculateOutputAssetQuantitiesInPips(
    LiquidityPool memory pool,
    uint64 liquidityToBurnInPips
  )
    internal
    view
    returns (
      uint64 outputBaseAssetQuantityInPips,
      uint64 outputQuoteAssetQuantityInPips
    )
  {
    uint64 totalLiquidityInPips =
      AssetUnitConversions.assetUnitsToPips(
        IERC20(address(pool.liquidityProviderToken)).totalSupply(),
        Constants.liquidityProviderTokenDecimals
      );

    outputBaseAssetQuantityInPips = calculateOutputQuantityInPips(
      liquidityToBurnInPips,
      totalLiquidityInPips,
      pool.baseAssetReserveInPips
    );
    outputQuoteAssetQuantityInPips = calculateOutputQuantityInPips(
      liquidityToBurnInPips,
      totalLiquidityInPips,
      pool.quoteAssetReserveInPips
    );
  }

  function calculateOutputLiquidityInPips(
    LiquidityPool memory pool,
    uint64 baseQuantityInPips,
    uint64 quoteQuantityInPips
  ) internal view returns (uint64 outputLiquidityInPips) {
    uint256 totalSupplyInAssetUnits =
      IERC20(address(pool.liquidityProviderToken)).totalSupply();
    if (totalSupplyInAssetUnits == 0) {
      return sqrt(baseQuantityInPips * quoteQuantityInPips);
    }

    uint64 totalLiquidityInPips =
      AssetUnitConversions.assetUnitsToPips(
        totalSupplyInAssetUnits,
        Constants.liquidityProviderTokenDecimals
      );

    return
      min(
        calculateOutputQuantityInPips(
          baseQuantityInPips,
          pool.baseAssetReserveInPips,
          totalLiquidityInPips
        ),
        calculateOutputQuantityInPips(
          quoteQuantityInPips,
          pool.quoteAssetReserveInPips,
          totalLiquidityInPips
        )
      );
  }

  function calculateOutputQuantityInPips(
    uint64 inputQuantityInPips,
    uint64 totalInputReserveInPips,
    uint64 totalOutputReserveInPips
  ) private pure returns (uint64) {
    uint256 outputLiquidityInPips =
      (uint256(inputQuantityInPips) * totalOutputReserveInPips) /
        totalInputReserveInPips;
    require(outputLiquidityInPips < 2**64, 'Pip quantity overflows uint64');

    return uint64(outputLiquidityInPips);
  }

  function min(uint64 x, uint64 y) private pure returns (uint64 z) {
    z = x < y ? x : y;
  }

  function sqrt(uint64 y) private pure returns (uint64 z) {
    if (y > 3) {
      z = y;
      uint64 x = y / 2 + 1;
      while (x < z) {
        z = x;
        x = (y / x + x) / 2;
      }
    } else if (y != 0) {
      z = 1;
    }
  }
}
