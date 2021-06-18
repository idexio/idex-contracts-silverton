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
  )
    internal
    view
    returns (
      uint256 netBaseAssetQuantityInAssetUnits,
      uint256 netQuoteAssetQuantityInAssetUnits
    )
  {
    require(
      ((execution.baseAssetAddress == addition.assetA &&
        execution.quoteAssetAddress == addition.assetB) ||
        (execution.baseAssetAddress == addition.assetB &&
          execution.quoteAssetAddress == addition.assetA)),
      'Asset address mismatch'
    );

    require(
      execution.amountA >= addition.amountAMin &&
        execution.amountA <= addition.amountADesired,
      'Invalid amountA'
    );
    require(
      execution.amountB >= addition.amountBMin &&
        execution.amountB <= addition.amountBDesired,
      'Invalid amountB'
    );

    require(
      getFeeBasisPoints256(execution.feeAmountA, execution.amountA) <=
        Constants.maxTradeFeeBasisPoints,
      'Excessive A fee'
    );
    require(
      getFeeBasisPoints256(execution.feeAmountB, execution.amountB) <=
        Constants.maxTradeFeeBasisPoints,
      'Excessive B fee'
    );

    (
      netBaseAssetQuantityInAssetUnits,
      netQuoteAssetQuantityInAssetUnits
    ) = execution.baseAssetAddress == addition.assetA
      ? (
        execution.amountA - execution.feeAmountA,
        execution.amountB - execution.feeAmountB
      )
      : (
        execution.amountB - execution.feeAmountB,
        execution.amountA - execution.feeAmountA
      );

    uint256 totalLiquidity = pool.liquidityProviderToken.totalSupply();
    uint256 expectedLiquidity;
    if (totalLiquidity == 0) {
      expectedLiquidity =
        sqrt(
          netBaseAssetQuantityInAssetUnits * netQuoteAssetQuantityInAssetUnits
        ) -
        Constants.minimumLiquidity;
    } else {
      expectedLiquidity = min(
        (netBaseAssetQuantityInAssetUnits * (totalLiquidity)) /
          AssetUnitConversions.pipsToAssetUnits(
            pool.baseAssetReserveInPips,
            pool.baseAssetDecimals
          ),
        (netQuoteAssetQuantityInAssetUnits * (totalLiquidity)) /
          AssetUnitConversions.pipsToAssetUnits(
            pool.quoteAssetReserveInPips,
            pool.quoteAssetDecimals
          )
      );
    }
    require(
      execution.liquidity == expectedLiquidity,
      'Invalid liquidity minted'
    );
  }

  function validateLiquidityRemoval(
    LiquidityRemoval memory removal,
    LiquidityChangeExecution memory execution,
    LiquidityPool memory pool
  )
    internal
    view
    returns (
      uint256 grossBaseAssetQuantityInAssetUnits,
      uint256 grossQuoteAssetQuantityInAssetUnits
    )
  {
    require(
      ((execution.baseAssetAddress == removal.assetA &&
        execution.quoteAssetAddress == removal.assetB) ||
        (execution.baseAssetAddress == removal.assetB &&
          execution.quoteAssetAddress == removal.assetA)),
      'Asset address mismatch'
    );

    require(
      execution.amountA > 0 && execution.amountB > 0,
      'Insufficient liquidity burned'
    );
    require(execution.amountA >= removal.amountAMin, 'Invalid amountA');
    require(execution.amountB >= removal.amountBMin, 'Invalid amountB');

    require(
      getFeeBasisPoints256(execution.feeAmountA, execution.amountA) <=
        Constants.maxTradeFeeBasisPoints,
      'Excessive A fee'
    );
    require(
      getFeeBasisPoints256(execution.feeAmountB, execution.amountB) <=
        Constants.maxTradeFeeBasisPoints,
      'Excessive B fee'
    );

    (
      grossBaseAssetQuantityInAssetUnits,
      grossQuoteAssetQuantityInAssetUnits
    ) = execution.baseAssetAddress == removal.assetA
      ? (execution.amountA, execution.amountB)
      : (execution.amountB, execution.amountA);

    require(
      removal.liquidity == execution.liquidity,
      'Invalid liquidity burned'
    );

    (
      uint256 expectedBaseAssetQuantityInAssetUnits,
      uint256 expectedQuoteAssetQuantityInAssetUnits
    ) = getOutputAssetQuantitiesInAssetUnits(pool, execution.liquidity);

    require(
      grossBaseAssetQuantityInAssetUnits ==
        expectedBaseAssetQuantityInAssetUnits,
      'Invalid base amount'
    );
    require(
      grossQuoteAssetQuantityInAssetUnits ==
        expectedQuoteAssetQuantityInAssetUnits,
      'Invalid quote amount'
    );
  }

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
   * @dev Calculate reserve asset quantities to remove from a pool for a liquidity exit
   */
  function getOutputAssetQuantitiesInAssetUnits(
    LiquidityPool memory pool,
    uint256 liquidityToBurnInAssetUnits
  )
    internal
    view
    returns (
      uint256 outputBaseAssetQuantityInAssetUnits,
      uint256 outputQuoteAssetQuantityInAssetUnits
    )
  {
    uint256 totalLiquidityInAssetUnits =
      pool.liquidityProviderToken.totalSupply();

    outputBaseAssetQuantityInAssetUnits =
      (liquidityToBurnInAssetUnits *
        AssetUnitConversions.pipsToAssetUnits(
          pool.baseAssetReserveInPips,
          pool.baseAssetDecimals
        )) /
      totalLiquidityInAssetUnits;
    outputQuoteAssetQuantityInAssetUnits =
      (liquidityToBurnInAssetUnits *
        AssetUnitConversions.pipsToAssetUnits(
          pool.quoteAssetReserveInPips,
          pool.quoteAssetDecimals
        )) /
      totalLiquidityInAssetUnits;

    require(
      outputBaseAssetQuantityInAssetUnits > 0 &&
        outputQuoteAssetQuantityInAssetUnits > 0,
      'Insufficient liquidity'
    );
  }

  function isLimitOrderType(OrderType orderType) internal pure returns (bool) {
    return
      orderType == OrderType.Limit ||
      orderType == OrderType.LimitMaker ||
      orderType == OrderType.StopLossLimit ||
      orderType == OrderType.TakeProfitLimit;
  }

  function min(uint256 x, uint256 y) private pure returns (uint256 z) {
    z = x < y ? x : y;
  }

  function sqrt(uint256 y) private pure returns (uint256 z) {
    if (y > 3) {
      z = y;
      uint256 x = y / 2 + 1;
      while (x < z) {
        z = x;
        x = (y / x + x) / 2;
      }
    } else if (y != 0) {
      z = 1;
    }
  }
}
