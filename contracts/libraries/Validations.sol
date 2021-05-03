// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { Signatures } from './Signatures.sol';
import { UUID } from './UUID.sol';
import { Constants, Enums, Structs } from './Interfaces.sol';

library Validations {
  using AssetRegistry for AssetRegistry.Storage;

  uint64 public constant _basisPointsInTotal = 100 * 100; // 100 basis points/percent * 100 percent/total
  uint64 public constant _maxTradeFeeBasisPoints = 20 * 100; // 20%;

  function getFeeBasisPoints(uint64 fee, uint64 total)
    internal
    pure
    returns (uint64)
  {
    return (fee * _basisPointsInTotal) / total;
  }

  function validateLiquidityAddition(
    Structs.LiquidityAddition memory addition,
    Structs.LiquidityChangeExecution memory execution,
    Structs.LiquidityPool memory pool
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
        _maxTradeFeeBasisPoints,
      'Excessive A fee'
    );
    require(
      getFeeBasisPoints256(execution.feeAmountB, execution.amountB) <=
        _maxTradeFeeBasisPoints,
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

    uint256 totalLiquidityInAssetUnits = pool.pairTokenAddress.totalSupply();
    require(
      execution.liquidity ==
        min(
          // TODO Should this be gross quantity?
          (netBaseAssetQuantityInAssetUnits * (totalLiquidityInAssetUnits)) /
            AssetUnitConversions.pipsToAssetUnits(
              pool.baseAssetReserveInPips,
              Constants.pairTokenDecimals
            ),
          (netQuoteAssetQuantityInAssetUnits * (totalLiquidityInAssetUnits)) /
            AssetUnitConversions.pipsToAssetUnits(
              pool.quoteAssetReserveInPips,
              Constants.pairTokenDecimals
            )
        ),
      'Invalid liquidity minted'
    );
  }

  function validateLiquidityRemoval(
    Structs.LiquidityRemoval memory removal,
    Structs.LiquidityChangeExecution memory execution,
    Structs.LiquidityPool memory pool
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

    require(execution.amountA >= removal.amountAMin, 'Invalid amountA');
    require(execution.amountB >= removal.amountBMin, 'Invalid amountB');

    require(
      getFeeBasisPoints256(execution.feeAmountA, execution.amountA) <=
        _maxTradeFeeBasisPoints,
      'Excessive A fee'
    );
    require(
      getFeeBasisPoints256(execution.feeAmountB, execution.amountB) <=
        _maxTradeFeeBasisPoints,
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

    // https://github.com/Uniswap/uniswap-v2-core/blob/master/contracts/UniswapV2Pair.sol#L143
    uint256 totalLiquidityInAssetUnits = pool.pairTokenAddress.totalSupply();
    uint256 baseAssetReservesInAssetUnits =
      AssetUnitConversions.pipsToAssetUnits(
        pool.baseAssetReserveInPips,
        pool.baseAssetDecimals
      );
    uint256 quoteAssetReservesInAssetUnits =
      AssetUnitConversions.pipsToAssetUnits(
        pool.quoteAssetReserveInPips,
        pool.quoteAssetDecimals
      );
    require(
      removal.liquidity == execution.liquidity &&
        grossBaseAssetQuantityInAssetUnits ==
        (execution.liquidity * baseAssetReservesInAssetUnits) /
          totalLiquidityInAssetUnits,
      'Invalid base amount'
    );
    require(
      removal.liquidity == execution.liquidity &&
        grossQuoteAssetQuantityInAssetUnits ==
        (execution.liquidity * quoteAssetReservesInAssetUnits) /
          totalLiquidityInAssetUnits,
      'Invalid quote amount'
    );
  }

  function validateCounterpartyTrade(
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view returns (bytes32, bytes32) {
    // Counterparty trade validations
    validateAssetPair(buy, sell, trade, assetRegistry);
    validateLimitPrices(buy, sell, trade);
    (bytes32 buyHash, bytes32 sellHash) =
      validateOrderSignatures(buy, sell, trade);
    validateTradeFees(trade);

    return (buyHash, sellHash);
  }

  function validateHybridTrade(
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade,
    Structs.PoolTrade memory poolTrade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view returns (bytes32 buyHash, bytes32 sellHash) {
    // Counterparty trade validations
    (buyHash, sellHash) = validateOrderSignatures(buy, sell, trade);
    validateAssetPair(buy, sell, trade, assetRegistry);
    validateLimitPrices(buy, sell, trade);
    validateTradeFees(trade);

    // Pool trade validations
    require(
      trade.baseAssetAddress == poolTrade.baseAssetAddress &&
        trade.quoteAssetAddress == poolTrade.quoteAssetAddress,
      'Mismatched trades'
    );
    Structs.Order memory order =
      trade.makerSide == Enums.OrderSide.Buy ? sell : buy;
    validateLimitPrice(order, poolTrade);
    validatePoolTradeFees(order.side, poolTrade);
  }

  function validatePoolTrade(
    Structs.Order memory order,
    Structs.PoolTrade memory poolTrade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view returns (bytes32 orderHash) {
    orderHash = validateOrderSignature(
      order,
      poolTrade.baseAssetSymbol,
      poolTrade.quoteAssetSymbol
    );
    validateAssetPair(order, poolTrade, assetRegistry);
    validateLimitPrice(order, poolTrade);
    validatePoolTradeFees(order.side, poolTrade);
  }

  function validateAssetPair(
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view {
    require(
      trade.baseAssetAddress != trade.quoteAssetAddress,
      'Trade assets must be different'
    );

    validateAssetPair(buy, trade, assetRegistry);
    validateAssetPair(sell, trade, assetRegistry);

    // Fee asset validation
    require(
      (trade.makerFeeAssetAddress == trade.baseAssetAddress &&
        trade.takerFeeAssetAddress == trade.quoteAssetAddress) ||
        (trade.makerFeeAssetAddress == trade.quoteAssetAddress &&
          trade.takerFeeAssetAddress == trade.baseAssetAddress),
      'Fee asset is not in trade pair'
    );
    require(
      trade.makerFeeAssetAddress != trade.takerFeeAssetAddress,
      'Fee assets must be different'
    );
  }

  function validateAssetPair(
    Structs.Order memory order,
    Structs.Trade memory trade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view {
    uint64 nonce = UUID.getTimestampInMsFromUuidV1(order.nonce);
    Structs.Asset memory baseAsset =
      assetRegistry.loadAssetBySymbol(trade.baseAssetSymbol, nonce);
    Structs.Asset memory quoteAsset =
      assetRegistry.loadAssetBySymbol(trade.quoteAssetSymbol, nonce);

    require(
      baseAsset.assetAddress == trade.baseAssetAddress &&
        quoteAsset.assetAddress == trade.quoteAssetAddress,
      'Order symbol address mismatch'
    );
  }

  function validateAssetPair(
    Structs.Order memory order,
    Structs.PoolTrade memory poolTrade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view {
    require(
      poolTrade.baseAssetAddress != poolTrade.quoteAssetAddress,
      'Trade assets must be different'
    );

    uint64 nonce = UUID.getTimestampInMsFromUuidV1(order.nonce);
    Structs.Asset memory baseAsset =
      assetRegistry.loadAssetBySymbol(poolTrade.baseAssetSymbol, nonce);
    Structs.Asset memory quoteAsset =
      assetRegistry.loadAssetBySymbol(poolTrade.quoteAssetSymbol, nonce);

    require(
      baseAsset.assetAddress == poolTrade.baseAssetAddress &&
        quoteAsset.assetAddress == poolTrade.quoteAssetAddress,
      'Order symbol address mismatch'
    );
  }

  function validateLimitPrices(
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade
  ) internal pure {
    require(
      trade.grossBaseQuantityInPips > 0,
      'Base quantity must be greater than zero'
    );
    require(
      trade.grossQuoteQuantityInPips > 0,
      'Quote quantity must be greater than zero'
    );

    if (isLimitOrderType(buy.orderType)) {
      require(
        getImpliedQuoteQuantityInPips(
          trade.grossBaseQuantityInPips,
          buy.limitPriceInPips
        ) >= trade.grossQuoteQuantityInPips,
        'Buy order limit price exceeded'
      );
    }

    if (isLimitOrderType(sell.orderType)) {
      require(
        getImpliedQuoteQuantityInPips(
          trade.grossBaseQuantityInPips,
          sell.limitPriceInPips
        ) <= trade.grossQuoteQuantityInPips,
        'Sell order limit price exceeded'
      );
    }
  }

  function validateLimitPrice(
    Structs.Order memory order,
    Structs.PoolTrade memory poolTrade
  ) internal pure {
    require(
      poolTrade.grossBaseQuantityInPips > 0,
      'Base quantity must be greater than zero'
    );
    require(
      poolTrade.grossQuoteQuantityInPips > 0,
      'Quote quantity must be greater than zero'
    );

    if (
      order.side == Enums.OrderSide.Buy && isLimitOrderType(order.orderType)
    ) {
      require(
        getImpliedQuoteQuantityInPips(
          poolTrade.grossBaseQuantityInPips,
          order.limitPriceInPips
        ) >= poolTrade.grossQuoteQuantityInPips,
        'Buy order limit price exceeded'
      );
    }

    if (
      order.side == Enums.OrderSide.Sell && isLimitOrderType(order.orderType)
    ) {
      require(
        getImpliedQuoteQuantityInPips(
          poolTrade.grossBaseQuantityInPips,
          order.limitPriceInPips
        ) <= poolTrade.grossQuoteQuantityInPips,
        'Sell order limit price exceeded'
      );
    }
  }

  function validateLimitPrice(
    Structs.Order memory order,
    uint64 baseAssetReserveInPips,
    uint64 quoteAssetReserveInPips
  ) internal pure {
    if (
      order.side == Enums.OrderSide.Buy && isLimitOrderType(order.orderType)
    ) {
      require(
        getImpliedQuoteQuantityInPips(
          baseAssetReserveInPips,
          order.limitPriceInPips
        ) <= quoteAssetReserveInPips,
        'Pool marginal buy price exceeded'
      );
    }

    if (
      order.side == Enums.OrderSide.Sell && isLimitOrderType(order.orderType)
    ) {
      require(
        getImpliedQuoteQuantityInPips(
          quoteAssetReserveInPips,
          order.limitPriceInPips
        ) >= quoteAssetReserveInPips,
        'Pool marginal sell price exceeded'
      );
    }
  }

  function validateTradeFees(Structs.Trade memory trade) internal pure {
    uint64 makerTotalQuantityInPips =
      trade.makerFeeAssetAddress == trade.baseAssetAddress
        ? trade.grossBaseQuantityInPips
        : trade.grossQuoteQuantityInPips;
    require(
      getFeeBasisPoints(
        trade.makerFeeQuantityInPips,
        makerTotalQuantityInPips
      ) <= _maxTradeFeeBasisPoints,
      'Excessive maker fee'
    );

    uint64 takerTotalQuantityInPips =
      trade.takerFeeAssetAddress == trade.baseAssetAddress
        ? trade.grossBaseQuantityInPips
        : trade.grossQuoteQuantityInPips;
    require(
      getFeeBasisPoints(
        trade.takerFeeQuantityInPips,
        takerTotalQuantityInPips
      ) <= _maxTradeFeeBasisPoints,
      'Excessive taker fee'
    );

    require(
      trade.netBaseQuantityInPips +
        (
          trade.makerFeeAssetAddress == trade.baseAssetAddress
            ? trade.makerFeeQuantityInPips
            : trade.takerFeeQuantityInPips
        ) ==
        trade.grossBaseQuantityInPips,
      'Net base plus fee is not equal to gross'
    );
    require(
      trade.netQuoteQuantityInPips +
        (
          trade.makerFeeAssetAddress == trade.quoteAssetAddress
            ? trade.makerFeeQuantityInPips
            : trade.takerFeeQuantityInPips
        ) ==
        trade.grossQuoteQuantityInPips,
      'Net quote plus fee is not equal to gross'
    );
  }

  function validatePoolTradeFees(
    Enums.OrderSide orderSide,
    Structs.PoolTrade memory poolTrade
  ) internal pure {
    uint64 totalQuantityInPips =
      orderSide == Enums.OrderSide.Buy
        ? poolTrade.grossQuoteQuantityInPips
        : poolTrade.grossBaseQuantityInPips;
    uint64 totalFeeQuantityInPips =
      poolTrade.takerPoolFeeQuantityInPips +
        poolTrade.takerProtocolFeeQuantityInPips;

    require(
      getFeeBasisPoints(totalFeeQuantityInPips, totalQuantityInPips) <=
        _maxTradeFeeBasisPoints,
      'Excessive fee'
    );
  }

  function validateOrderSignatures(
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade
  ) internal pure returns (bytes32, bytes32) {
    bytes32 buyOrderHash =
      validateOrderSignature(
        buy,
        trade.baseAssetSymbol,
        trade.quoteAssetSymbol
      );
    bytes32 sellOrderHash =
      validateOrderSignature(
        sell,
        trade.baseAssetSymbol,
        trade.quoteAssetSymbol
      );

    return (buyOrderHash, sellOrderHash);
  }

  function validateOrderSignature(
    Structs.Order memory order,
    string memory baseAssetSymbol,
    string memory quoteAssetSymbol
  ) internal pure returns (bytes32) {
    bytes32 orderHash =
      Signatures.getOrderWalletHash(order, baseAssetSymbol, quoteAssetSymbol);

    require(
      Signatures.isSignatureValid(
        orderHash,
        order.walletSignature,
        order.walletAddress
      ),
      order.side == Enums.OrderSide.Buy
        ? 'Invalid wallet signature for buy order'
        : 'Invalid wallet signature for sell order'
    );

    return orderHash;
  }

  function validateWithdrawalSignature(Structs.Withdrawal memory withdrawal)
    internal
    pure
    returns (bytes32)
  {
    bytes32 withdrawalHash = Signatures.getWithdrawalWalletHash(withdrawal);

    require(
      Signatures.isSignatureValid(
        withdrawalHash,
        withdrawal.walletSignature,
        withdrawal.walletAddress
      ),
      'Invalid wallet signature'
    );

    return withdrawalHash;
  }

  // Utils //

  function getFeeBasisPoints256(uint256 fee, uint256 total)
    private
    pure
    returns (uint256)
  {
    return (fee * _basisPointsInTotal) / total;
  }

  function getImpliedQuoteQuantityInPips(
    uint64 baseQuantityInPips,
    uint64 limitPriceInPips
  ) private pure returns (uint64) {
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

  function isLimitOrderType(Enums.OrderType orderType)
    private
    pure
    returns (bool)
  {
    return
      orderType == Enums.OrderType.Limit ||
      orderType == Enums.OrderType.LimitMaker ||
      orderType == Enums.OrderType.StopLossLimit ||
      orderType == Enums.OrderType.TakeProfitLimit;
  }

  function min(uint256 x, uint256 y) private pure returns (uint256 z) {
    z = x < y ? x : y;
  }
}
