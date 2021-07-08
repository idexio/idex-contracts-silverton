// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { Constants } from './Constants.sol';
import { Hashing } from './Hashing.sol';
import { IERC20 } from './Interfaces.sol';
import { UUID } from './UUID.sol';
import { OrderSide, OrderType } from './Enums.sol';
import {
  Asset,
  LiquidityPool,
  Order,
  OrderBookTrade,
  PoolTrade,
  Withdrawal
} from './Structs.sol';

library Validations {
  using AssetRegistry for AssetRegistry.Storage;

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
        'Pool input fees unbalanced'
      );
      // Net output plus fees will be less than gross for non-zero input fees since the pool output
      // is decreased commensurately to satisfy the constant product price formula
      require(
        poolTrade.netBaseQuantityInPips + poolTrade.takerGasFeeQuantityInPips <=
          poolTrade.grossBaseQuantityInPips,
        'Pool output fees unbalanced'
      );
      // Price correction only allowed for hybrid trades with a taker sell
      require(
        poolTrade.takerPriceCorrectionFeeQuantityInPips == 0,
        'Price correction not allowed'
      );
    } else {
      // Sell order sends base as pool input, receives quote as pool output
      require(
        poolTrade.netBaseQuantityInPips +
          poolTrade.takerPoolFeeQuantityInPips +
          poolTrade.takerProtocolFeeQuantityInPips ==
          poolTrade.grossBaseQuantityInPips,
        'Pool input fees unbalanced'
      );
      // Net output plus fees will be less than gross for non-zero input fees since the pool output
      // is decreased commensurately to satisfy the constant product price formula
      require(
        poolTrade.netQuoteQuantityInPips +
          poolTrade.takerGasFeeQuantityInPips +
          poolTrade.takerPriceCorrectionFeeQuantityInPips <=
          poolTrade.grossQuoteQuantityInPips,
        'Pool output fees unbalanced'
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

  function calculateImpliedQuoteQuantityInPips(
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

  function isFeeQuantityValid(uint64 fee, uint64 total)
    internal
    pure
    returns (bool)
  {
    uint64 feeBasisPoints = (fee * Constants.basisPointsInTotal) / total;
    return feeBasisPoints <= Constants.maxFeeBasisPoints;
  }

  function isLimitOrderType(OrderType orderType) internal pure returns (bool) {
    return
      orderType == OrderType.Limit ||
      orderType == OrderType.LimitMaker ||
      orderType == OrderType.StopLossLimit ||
      orderType == OrderType.TakeProfitLimit;
  }
}
