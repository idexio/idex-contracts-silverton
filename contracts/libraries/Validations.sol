// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { Constants } from './Constants.sol';
import { Hashing } from './Hashing.sol';
import { IERC20 } from './Interfaces.sol';
import { Math } from './Math.sol';
import { UUID } from './UUID.sol';
import { OrderSide, OrderType } from './Enums.sol';
import {
  Asset,
  LiquidityPool,
  Order,
  OrderBookTrade,
  NonceInvalidation,
  PoolTrade,
  Withdrawal
} from './Structs.sol';

library Validations {
  using AssetRegistry for AssetRegistry.Storage;

  /**
   * @dev Perform fee validations common to both orderbook-only and hybrid trades. Does not
   * validate if fees are excessive as taker fee structure differs between these trade types
   *
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

  function validateOrderNonce(
    Order memory order,
    mapping(address => NonceInvalidation) storage nonceInvalidations
  ) internal view {
    require(
      UUID.getTimestampInMsFromUuidV1(order.nonce) >
        loadLastInvalidatedTimestamp(order.walletAddress, nonceInvalidations),
      'Order nonce timestamp too low'
    );
  }

  function validateOrderNonces(
    Order memory buy,
    Order memory sell,
    mapping(address => NonceInvalidation) storage nonceInvalidations
  ) internal view {
    require(
      UUID.getTimestampInMsFromUuidV1(buy.nonce) >
        loadLastInvalidatedTimestamp(buy.walletAddress, nonceInvalidations),
      'Buy order nonce timestamp too low'
    );
    require(
      UUID.getTimestampInMsFromUuidV1(sell.nonce) >
        loadLastInvalidatedTimestamp(sell.walletAddress, nonceInvalidations),
      'Sell order nonce timestamp too low'
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

  function validatePoolReserveRatio(LiquidityPool memory pool) internal pure {
    (uint64 sortedReserve0, uint64 sortedReserve1) =
      pool.baseAssetReserveInPips <= pool.quoteAssetReserveInPips
        ? (pool.baseAssetReserveInPips, pool.quoteAssetReserveInPips)
        : (pool.quoteAssetReserveInPips, pool.baseAssetReserveInPips);
    require(
      uint256(sortedReserve0) * Constants.maxLiquidityPoolReserveRatio >=
        sortedReserve1,
      'Exceeded max reserve ratio'
    );
  }

  /**
   * @dev Perform fee validations common to both pool-only and hybrid trades
   */
  function validatePoolTradeInputFees(
    OrderSide orderSide,
    PoolTrade memory poolTrade
  ) internal pure {
    // Buy order sends quote as pool input, receives base as pool output; sell order sends base as
    // pool input, receives quote as pool output
    (uint64 netInputQuantityInPips, uint64 grossInputQuantityInPips) =
      orderSide == OrderSide.Buy
        ? (poolTrade.netQuoteQuantityInPips, poolTrade.grossQuoteQuantityInPips)
        : (poolTrade.netBaseQuantityInPips, poolTrade.grossBaseQuantityInPips);

    require(
      netInputQuantityInPips +
        poolTrade.takerPoolFeeQuantityInPips +
        poolTrade.takerProtocolFeeQuantityInPips ==
        grossInputQuantityInPips,
      'Pool input fees unbalanced'
    );
    require(
      Validations.isFeeQuantityValid(
        grossInputQuantityInPips - netInputQuantityInPips,
        grossInputQuantityInPips,
        Constants.maxPoolInputFeeBasisPoints
      ),
      'Excessive pool input fee'
    );
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
    return
      Math.multiplyPipsByFraction(
        baseQuantityInPips,
        limitPriceInPips,
        Constants.pipPriceMultiplier
      );
  }

  function loadLastInvalidatedTimestamp(
    address walletAddress,
    mapping(address => NonceInvalidation) storage nonceInvalidations
  ) private view returns (uint64) {
    if (
      nonceInvalidations[walletAddress].exists &&
      nonceInvalidations[walletAddress].effectiveBlockNumber <= block.number
    ) {
      return nonceInvalidations[walletAddress].timestampInMs;
    }

    return 0;
  }

  function isFeeQuantityValid(
    uint64 fee,
    uint64 total,
    uint64 max
  ) internal pure returns (bool) {
    uint64 feeBasisPoints = (fee * Constants.basisPointsInTotal) / total;
    return feeBasisPoints <= max;
  }

  function isLimitOrderType(OrderType orderType) internal pure returns (bool) {
    return
      orderType == OrderType.Limit ||
      orderType == OrderType.LimitMaker ||
      orderType == OrderType.StopLossLimit ||
      orderType == OrderType.TakeProfitLimit;
  }
}
