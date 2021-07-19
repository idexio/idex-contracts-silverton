// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { Constants } from './Constants.sol';
import { IERC20 } from './Interfaces.sol';
import { LiquidityPool } from './Structs.sol';
import { Math } from './Math.sol';

library LiquidityPoolHelpers {
  function calculateCurrentPoolPriceInPips(LiquidityPool memory self)
    internal
    pure
    returns (uint64)
  {
    if (self.baseAssetReserveInPips == 0) {
      return 0;
    }

    return
      Math.multiplyPipsByFraction(
        Constants.pipPriceMultiplier,
        self.quoteAssetReserveInPips,
        self.baseAssetReserveInPips
      );
  }

  /**
   * @dev Calculate reserve asset quantities to remove from a pool for a given liquidity amount
   */
  function calculateOutputAssetQuantitiesInPips(
    LiquidityPool memory self,
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
        IERC20(address(self.liquidityProviderToken)).totalSupply(),
        Constants.liquidityProviderTokenDecimals
      );

    // Use fraction of total liquidity burned to calculate proportionate base amount out
    outputBaseAssetQuantityInPips = Math.multiplyPipsByFraction(
      self.baseAssetReserveInPips,
      liquidityToBurnInPips,
      totalLiquidityInPips
    );
    // Calculate quote amount out that maintains the current pool price given above base amount out
    outputQuoteAssetQuantityInPips =
      self.quoteAssetReserveInPips -
      Math.multiplyPipsByFraction(
        self.baseAssetReserveInPips - outputBaseAssetQuantityInPips,
        calculateCurrentPoolPriceInPips(self),
        Constants.pipPriceMultiplier
      );
  }

  /**
   * @dev Calculate LP token quantity to mint for given reserve asset quantities
   */
  function calculateOutputLiquidityInPips(
    LiquidityPool memory self,
    uint64 baseQuantityInPips,
    uint64 quoteQuantityInPips
  ) internal view returns (uint64 outputLiquidityInPips) {
    uint256 totalSupplyInAssetUnits =
      IERC20(address(self.liquidityProviderToken)).totalSupply();

    // For initial deposit use geometric mean of reserve quantities
    if (totalSupplyInAssetUnits == 0) {
      return Math.sqrt(baseQuantityInPips * quoteQuantityInPips);
    }

    uint64 totalLiquidityInPips =
      AssetUnitConversions.assetUnitsToPips(
        totalSupplyInAssetUnits,
        Constants.liquidityProviderTokenDecimals
      );

    return
      Math.min(
        Math.multiplyPipsByFraction(
          totalLiquidityInPips,
          baseQuantityInPips,
          self.baseAssetReserveInPips
        ),
        Math.multiplyPipsByFraction(
          totalLiquidityInPips,
          quoteQuantityInPips,
          self.quoteAssetReserveInPips
        )
      );
  }
}
