// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { AssetRegistry } from './AssetRegistry.sol';
import { Constants } from './Constants.sol';
import { OrderSide } from './Enums.sol';
import { Hashing } from './Hashing.sol';
import { UUID } from './UUID.sol';
import { Validations } from './Validations.sol';
import { Asset, Order, OrderBookTrade, NonceInvalidation } from './Structs.sol';

library OrderBookTradeValidations {
  using AssetRegistry for AssetRegistry.Storage;

  function validateOrderBookTrade(
    Order memory buy,
    Order memory sell,
    OrderBookTrade memory trade,
    AssetRegistry.Storage storage assetRegistry,
    mapping(address => NonceInvalidation) storage nonceInvalidations
  ) internal view returns (bytes32, bytes32) {
    require(
      buy.walletAddress != sell.walletAddress,
      'Self-trading not allowed'
    );

    // Order book trade validations
    validateAssetPair(buy, sell, trade, assetRegistry);
    validateLimitPrices(buy, sell, trade);
    Validations.validateOrderNonces(buy, sell, nonceInvalidations);
    (bytes32 buyHash, bytes32 sellHash) =
      validateOrderSignatures(buy, sell, trade);
    validateFees(trade);

    return (buyHash, sellHash);
  }

  function validateAssetPair(
    Order memory buy,
    Order memory sell,
    OrderBookTrade memory trade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view {
    require(
      trade.baseAssetAddress != trade.quoteAssetAddress,
      'Trade assets must be different'
    );

    // Fee asset validation
    require(
      (trade.makerFeeAssetAddress == trade.baseAssetAddress &&
        trade.takerFeeAssetAddress == trade.quoteAssetAddress) ||
        (trade.makerFeeAssetAddress == trade.quoteAssetAddress &&
          trade.takerFeeAssetAddress == trade.baseAssetAddress),
      'Fee assets mismatch trade pair'
    );

    validateAssetPair(buy, trade, assetRegistry);
    validateAssetPair(sell, trade, assetRegistry);
  }

  function validateAssetPair(
    Order memory order,
    OrderBookTrade memory trade,
    AssetRegistry.Storage storage assetRegistry
  ) internal view {
    uint64 timestampInMs = UUID.getTimestampInMsFromUuidV1(order.nonce);
    Asset memory baseAsset =
      assetRegistry.loadAssetBySymbol(trade.baseAssetSymbol, timestampInMs);
    Asset memory quoteAsset =
      assetRegistry.loadAssetBySymbol(trade.quoteAssetSymbol, timestampInMs);

    require(
      baseAsset.assetAddress == trade.baseAssetAddress &&
        quoteAsset.assetAddress == trade.quoteAssetAddress,
      'Order symbol address mismatch'
    );
  }

  function validateLimitPrices(
    Order memory buy,
    Order memory sell,
    OrderBookTrade memory trade
  ) internal pure {
    require(
      trade.grossBaseQuantityInPips > 0,
      'Base quantity must be greater than zero'
    );
    require(
      trade.grossQuoteQuantityInPips > 0,
      'Quote quantity must be greater than zero'
    );

    if (Validations.isLimitOrderType(buy.orderType)) {
      require(
        Validations.calculateImpliedQuoteQuantityInPips(
          trade.grossBaseQuantityInPips,
          buy.limitPriceInPips
        ) >= trade.grossQuoteQuantityInPips,
        'Buy order limit price exceeded'
      );
    }

    if (Validations.isLimitOrderType(sell.orderType)) {
      require(
        Validations.calculateImpliedQuoteQuantityInPips(
          trade.grossBaseQuantityInPips,
          sell.limitPriceInPips
        ) <= trade.grossQuoteQuantityInPips,
        'Sell order limit price exceeded'
      );
    }
  }

  function validateOrderSignatures(
    Order memory buy,
    Order memory sell,
    OrderBookTrade memory trade
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

  function validateFees(OrderBookTrade memory trade) private pure {
    uint64 makerTotalQuantityInPips =
      trade.makerFeeAssetAddress == trade.baseAssetAddress
        ? trade.grossBaseQuantityInPips
        : trade.grossQuoteQuantityInPips;
    require(
      Validations.isFeeQuantityValid(
        trade.makerFeeQuantityInPips,
        makerTotalQuantityInPips,
        Constants.maxFeeBasisPoints
      ),
      'Excessive maker fee'
    );

    uint64 takerTotalQuantityInPips =
      trade.takerFeeAssetAddress == trade.baseAssetAddress
        ? trade.grossBaseQuantityInPips
        : trade.grossQuoteQuantityInPips;
    require(
      Validations.isFeeQuantityValid(
        trade.takerFeeQuantityInPips,
        takerTotalQuantityInPips,
        Constants.maxFeeBasisPoints
      ),
      'Excessive taker fee'
    );

    Validations.validateOrderBookTradeFees(trade);
  }
}
