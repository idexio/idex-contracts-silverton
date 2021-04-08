// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { AssetRegistry } from './AssetRegistry.sol';
import { Enums, Structs } from './Interfaces.sol';
import { Signatures } from './Signatures.sol';
import { UUID } from './UUID.sol';

library Validations {
  using AssetRegistry for AssetRegistry.Storage;

  function validateHybridTrade(
    AssetRegistry.Storage storage assetRegistry,
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade,
    Structs.PoolTrade memory poolTrade,
    uint64 maxTradeFeeBasisPoints
  ) public view returns (bytes32, bytes32) {
    // Counterparty trade validations
    validateAssetPair(assetRegistry, buy, sell, trade);
    validateLimitPrices(buy, sell, trade);
    (bytes32 buyHash, bytes32 sellHash) =
      validateOrderSignatures(buy, sell, trade);
    validateTradeFees(trade, maxTradeFeeBasisPoints);

    // Pool trade validations
    require(
      trade.baseAssetAddress == poolTrade.baseAssetAddress &&
        trade.quoteAssetAddress == poolTrade.quoteAssetAddress,
      'Mismatched trades'
    );
    Structs.Order memory order =
      trade.makerSide == Enums.OrderSide.Buy ? sell : buy;
    validateLimitPrice(order, poolTrade);
    validatePoolTradeFees(order.side, poolTrade, maxTradeFeeBasisPoints);

    return (buyHash, sellHash);
  }

  function getFeeBasisPoints(uint64 fee, uint64 total)
    public
    pure
    returns (uint64)
  {
    uint64 basisPointsInTotal = 100 * 100; // 100 basis points/percent * 100 percent/total
    return (fee * basisPointsInTotal) / total;
  }

  function validateAssetPair(
    AssetRegistry.Storage storage assetRegistry,
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade
  ) public view {
    require(
      trade.baseAssetAddress != trade.quoteAssetAddress,
      'Trade assets must be different'
    );

    validateAssetPair(assetRegistry, buy, trade);
    validateAssetPair(assetRegistry, sell, trade);

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
    AssetRegistry.Storage storage assetRegistry,
    Structs.Order memory order,
    Structs.Trade memory trade
  ) public view {
    uint64 nonce = UUID.getTimestampInMsFromUuidV1(order.nonce);
    Structs.Asset memory asset =
      assetRegistry.loadAssetBySymbol(trade.baseAssetSymbol, nonce);
    require(
      asset.assetAddress == trade.baseAssetAddress,
      'Order symbol address mismatch'
    );

    asset = assetRegistry.loadAssetBySymbol(trade.quoteAssetSymbol, nonce);
    require(
      asset.assetAddress == trade.quoteAssetAddress,
      'Order symbol address mismatch'
    );
  }

  function validateAssetPair(
    AssetRegistry.Storage storage assetRegistry,
    Structs.Order memory order,
    Structs.PoolTrade memory poolTrade
  ) public view {
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
  ) public pure {
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
  ) public pure {
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

  function validateTradeFees(
    Structs.Trade memory trade,
    uint64 maxTradeFeeBasisPoints
  ) public pure {
    uint64 makerTotalQuantityInPips =
      trade.makerFeeAssetAddress == trade.baseAssetAddress
        ? trade.grossBaseQuantityInPips
        : trade.grossQuoteQuantityInPips;
    require(
      getFeeBasisPoints(
        trade.makerFeeQuantityInPips,
        makerTotalQuantityInPips
      ) <= maxTradeFeeBasisPoints,
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
      ) <= maxTradeFeeBasisPoints,
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
    Structs.PoolTrade memory poolTrade,
    uint64 maxTradeFeeBasisPoints
  ) public pure {
    uint64 totalQuantityInPips =
      orderSide == Enums.OrderSide.Buy
        ? poolTrade.grossQuoteQuantityInPips
        : poolTrade.grossBaseQuantityInPips;
    uint64 totalFeeQuantityInPips =
      poolTrade.takerPoolFeeQuantityInPips +
        poolTrade.takerProtocolFeeQuantityInPips;

    require(
      getFeeBasisPoints(totalFeeQuantityInPips, totalQuantityInPips) <=
        maxTradeFeeBasisPoints,
      'Excessive fee'
    );
  }

  function validateOrderSignatures(
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade
  ) public pure returns (bytes32, bytes32) {
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
  ) public pure returns (bytes32) {
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
    public
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
}
