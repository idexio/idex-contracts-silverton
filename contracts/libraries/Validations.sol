// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { Constants } from './Constants.sol';
import { Hashing } from './Hashing.sol';
import { UUID } from './UUID.sol';
import { OrderSide, OrderType } from './Enums.sol';
import {
  Asset,
  LiquidityAddition,
  LiquidityChangeExecution,
  LiquidityPool,
  LiquidityRemoval,
  Order,
  OrderBookTrade,
  PoolTrade,
  Withdrawal
} from './Structs.sol';

library Validations {
  using AssetRegistry for AssetRegistry.Storage;

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

    (uint64 minBase, uint64 maxBase) =
      execution.baseAssetAddress == addition.assetA
        ? (
          AssetUnitConversions.assetUnitsToPips(
            addition.amountAMin,
            pool.baseAssetDecimals
          ),
          AssetUnitConversions.assetUnitsToPips(
            addition.amountADesired,
            pool.baseAssetDecimals
          )
        )
        : (
          AssetUnitConversions.assetUnitsToPips(
            addition.amountBMin,
            pool.baseAssetDecimals
          ),
          AssetUnitConversions.assetUnitsToPips(
            addition.amountBDesired,
            pool.baseAssetDecimals
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

    (uint64 minQuote, uint64 maxQuote) =
      execution.baseAssetAddress == addition.assetA
        ? (
          AssetUnitConversions.assetUnitsToPips(
            addition.amountBMin,
            pool.quoteAssetDecimals
          ),
          AssetUnitConversions.assetUnitsToPips(
            addition.amountBDesired,
            pool.quoteAssetDecimals
          )
        )
        : (
          AssetUnitConversions.assetUnitsToPips(
            addition.amountAMin,
            pool.quoteAssetDecimals
          ),
          AssetUnitConversions.assetUnitsToPips(
            addition.amountADesired,
            pool.quoteAssetDecimals
          )
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
      getFeeBasisPoints(
        execution.grossBaseQuantityInPips - execution.netBaseQuantityInPips,
        execution.grossBaseQuantityInPips
      ) <= Constants.maxTradeFeeBasisPoints,
      'Excessive base fee'
    );
    require(
      getFeeBasisPoints(
        execution.grossQuoteQuantityInPips - execution.netQuoteQuantityInPips,
        execution.grossQuoteQuantityInPips
      ) <= Constants.maxTradeFeeBasisPoints,
      'Excessive quote fee'
    );

    require(
      execution.liquidityInPips > 0 &&
        execution.liquidityInPips ==
        getOutputLiquidityInPips(
          pool,
          execution.netBaseQuantityInPips,
          execution.netQuoteQuantityInPips
        ),
      'Invalid liquidity minted'
    );
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

    require(
      getFeeBasisPoints(
        execution.grossBaseQuantityInPips - execution.netBaseQuantityInPips,
        execution.grossBaseQuantityInPips
      ) <= Constants.maxTradeFeeBasisPoints,
      'Excessive base fee'
    );
    require(
      getFeeBasisPoints(
        execution.grossQuoteQuantityInPips - execution.netQuoteQuantityInPips,
        execution.grossQuoteQuantityInPips
      ) <= Constants.maxTradeFeeBasisPoints,
      'Excessive quote fee'
    );

    require(
      execution.grossBaseQuantityInPips >=
        AssetUnitConversions.assetUnitsToPips(
          execution.baseAssetAddress == removal.assetA
            ? removal.amountAMin
            : removal.amountBMin,
          pool.baseAssetDecimals
        ),
      'Min base quantity not met'
    );
    require(
      execution.grossQuoteQuantityInPips >=
        AssetUnitConversions.assetUnitsToPips(
          execution.baseAssetAddress == removal.assetA
            ? removal.amountBMin
            : removal.amountAMin,
          pool.quoteAssetDecimals
        ),
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
    ) = getOutputAssetQuantitiesInPips(pool, execution.liquidityInPips);

    require(
      execution.grossBaseQuantityInPips == expectedBaseAssetQuantityInPips,
      'Invalid base quantity'
    );
    require(
      execution.grossQuoteQuantityInPips == expectedQuoteAssetQuantityInPips,
      'Invalid quote quantity'
    );
  }

  /**
   * @dev Perform fee validations common to both orderbook-only and hybrid trades
   */
  function validateOrderBookTradeFees(OrderBookTrade memory trade)
    internal
    pure
  {
    require(
      trade.netBaseQuantityInPips +
        (
          trade.makerFeeAssetAddress == trade.baseAssetAddress
            ? trade.makerFeeQuantityInPips
            : trade.takerFeeQuantityInPips
        ) ==
        trade.grossBaseQuantityInPips,
      'Orderbook base fees unbalanced'
    );
    require(
      trade.netQuoteQuantityInPips +
        (
          trade.makerFeeAssetAddress == trade.quoteAssetAddress
            ? trade.makerFeeQuantityInPips
            : trade.takerFeeQuantityInPips
        ) ==
        trade.grossQuoteQuantityInPips,
      'Orderbook quote fees unbalanced'
    );
  }

  function validateOrderSignature(
    Order memory order,
    string memory baseAssetSymbol,
    string memory quoteAssetSymbol
  ) internal pure returns (bytes32) {
    bytes32 orderHash =
      Hashing.getOrderHash(order, baseAssetSymbol, quoteAssetSymbol);

    require(
      Hashing.isSignatureValid(
        orderHash,
        order.walletSignature,
        order.walletAddress
      ),
      order.side == OrderSide.Buy
        ? 'Invalid wallet signature for buy order'
        : 'Invalid wallet signature for sell order'
    );

    return orderHash;
  }

  /**
   * @dev Perform fee validations common to both pool-only and hybrid trades
   */
  function validatePoolTradeFees(
    OrderSide orderSide,
    PoolTrade memory poolTrade
  ) internal pure {
    // The quantity received by the wallet is determined by the pool's constant product formula
    // and enforced in `LiquidityPoolRegistry.updateReservesForPoolTrade`
    if (orderSide == OrderSide.Buy) {
      // Buy order sends quote as pool input, receives base as pool output
      require(
        poolTrade.netQuoteQuantityInPips +
          poolTrade.takerPoolFeeQuantityInPips +
          poolTrade.takerProtocolFeeQuantityInPips ==
          poolTrade.grossQuoteQuantityInPips,
        'Pool quote fees unbalanced'
      );
    } else {
      // Sell order sends base as pool input, receives quote as pool output
      require(
        poolTrade.netBaseQuantityInPips +
          poolTrade.takerPoolFeeQuantityInPips +
          poolTrade.takerProtocolFeeQuantityInPips ==
          poolTrade.grossBaseQuantityInPips,
        'Pool base fees unbalanced'
      );
    }
  }

  function validateWithdrawalSignature(Withdrawal memory withdrawal)
    internal
    pure
    returns (bytes32)
  {
    bytes32 withdrawalHash = Hashing.getWithdrawalHash(withdrawal);

    require(
      Hashing.isSignatureValid(
        withdrawalHash,
        withdrawal.walletSignature,
        withdrawal.walletAddress
      ),
      'Invalid wallet signature'
    );

    return withdrawalHash;
  }

  // Utils //

  function getFeeBasisPoints(uint64 fee, uint64 total)
    internal
    pure
    returns (uint64)
  {
    return (fee * Constants.basisPointsInTotal) / total;
  }

  function getFeeBasisPoints256(uint256 fee, uint256 total)
    private
    pure
    returns (uint256)
  {
    return (fee * Constants.basisPointsInTotal) / total;
  }

  function getImpliedQuoteQuantityInPips(
    uint64 baseQuantityInPips,
    uint64 limitPriceInPips
  ) internal pure returns (uint64) {
    // To convert a fractional price to integer pips, shift right by the pip precision of 8 decimals
    uint256 pipsMultiplier = 10**8;

    uint256 impliedQuoteQuantityInPips =
      (uint256(baseQuantityInPips) * uint256(limitPriceInPips)) /
        pipsMultiplier;
    require(
      impliedQuoteQuantityInPips < 2**64,
      'Implied quote pip quantity overflows uint64'
    );

    return uint64(impliedQuoteQuantityInPips);
  }

  /**
   * @dev Calculate reserve asset quantities to remove from a pool for a given liquidity amount
   */
  function getOutputAssetQuantitiesInPips(
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
        pool.liquidityProviderToken.totalSupply(),
        Constants.liquidityProviderTokenDecimals
      );

    outputBaseAssetQuantityInPips = getOutputQuantityInPips(
      liquidityToBurnInPips,
      pool.baseAssetReserveInPips,
      totalLiquidityInPips
    );
    outputQuoteAssetQuantityInPips = getOutputQuantityInPips(
      liquidityToBurnInPips,
      pool.quoteAssetReserveInPips,
      totalLiquidityInPips
    );
  }

  function getOutputLiquidityInPips(
    LiquidityPool memory pool,
    uint64 baseQuantityInPips,
    uint64 quoteQuantityInPips
  ) internal view returns (uint64 outputLiquidityInPips) {
    if (pool.liquidityProviderToken.totalSupply() == 0) {
      return sqrt(baseQuantityInPips * quoteQuantityInPips);
    }

    uint64 totalLiquidityInPips =
      AssetUnitConversions.assetUnitsToPips(
        pool.liquidityProviderToken.totalSupply(),
        Constants.liquidityProviderTokenDecimals
      );

    return
      min(
        getOutputQuantityInPips(
          baseQuantityInPips,
          pool.baseAssetReserveInPips,
          totalLiquidityInPips
        ),
        getOutputQuantityInPips(
          quoteQuantityInPips,
          pool.quoteAssetReserveInPips,
          totalLiquidityInPips
        )
      );
  }

  function getOutputQuantityInPips(
    uint64 inputQuantityInPips,
    uint64 reserveQuantityInPips,
    uint64 totalLiquidityInPips
  ) private pure returns (uint64) {
    uint256 outputLiquidityInPips =
      (uint256(inputQuantityInPips) * totalLiquidityInPips) /
        reserveQuantityInPips;
    require(outputLiquidityInPips < 2**64, 'Pip quantity overflows uint64');

    return uint64(outputLiquidityInPips);
  }

  function isLimitOrderType(OrderType orderType) internal pure returns (bool) {
    return
      orderType == OrderType.Limit ||
      orderType == OrderType.LimitMaker ||
      orderType == OrderType.StopLossLimit ||
      orderType == OrderType.TakeProfitLimit;
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
