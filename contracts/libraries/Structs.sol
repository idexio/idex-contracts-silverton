// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { ILiquidityProviderToken, IWETH9 } from './Interfaces.sol';
import {
  LiquidityChangeOrigination,
  OrderSelfTradePrevention,
  OrderSide,
  OrderTimeInForce,
  OrderType,
  WithdrawalType
} from './Enums.sol';

/**
 * @notice Struct definitions
 */

/**
 * @notice State tracking for a hybrid liquidity pool
 *
 * @dev Base and quote asset decimals are denormalized here to avoid extra loads from
 * `AssetRegistry.Storage`
 */
struct LiquidityPool {
  // Flag to distinguish from empty struct
  bool exists;
  uint64 baseAssetReserveInPips;
  uint8 baseAssetDecimals;
  uint64 quoteAssetReserveInPips;
  uint8 quoteAssetDecimals;
  ILiquidityProviderToken liquidityProviderToken;
}

/**
 * @dev Internal struct capturing user-initiated liquidity addition request parameters
 */
struct LiquidityAddition {
  // Must equal `Constants.signatureHashVersion`
  uint8 signatureHashVersion;
  // Distinguishes between liquidity additions initated on- or off- chain
  LiquidityChangeOrigination origination;
  // UUIDv1 unique to wallet
  uint128 nonce;
  address wallet;
  address assetA;
  address assetB;
  uint256 amountADesired;
  uint256 amountBDesired;
  uint256 amountAMin;
  uint256 amountBMin;
  address to;
  uint256 deadline;
  bytes signature;
}

/**
 * @notice Internally used struct, return type from `LiquidityPools.addLiquidity`
 */
struct LiquidityAdditionDepositResult {
  string assetASymbol;
  uint64 assetAQuantityInPips;
  uint64 assetANewExchangeBalanceInPips;
  uint256 assetANewExchangeBalanceInAssetUnits;
  string assetBSymbol;
  uint64 assetBQuantityInPips;
  uint64 assetBNewExchangeBalanceInPips;
  uint256 assetBNewExchangeBalanceInAssetUnits;
}

/**
 * @notice Internally used struct, return type from `LiquidityPools.removeLiquidity`
 */
struct LiquidityRemovalDepositResult {
  address assetAddress;
  string assetSymbol;
  uint64 assetQuantityInPips;
  uint64 assetNewExchangeBalanceInPips;
  uint256 assetNewExchangeBalanceInAssetUnits;
}

/**
 * @dev Internal struct capturing user-initiated liquidity removal request parameters
 */
struct LiquidityRemoval {
  // Must equal `Constants.signatureHashVersion`
  uint8 signatureHashVersion;
  // Distinguishes between liquidity additions initated on- or off- chain
  LiquidityChangeOrigination origination;
  uint128 nonce;
  address wallet;
  address assetA;
  address assetB;
  uint256 liquidity;
  uint256 amountAMin;
  uint256 amountBMin;
  address payable to;
  uint256 deadline;
  bytes signature;
}

/**
 * @notice Argument type to `Exchange.executeAddLiquidity` and `Exchange.executeRemoveLiquidity`
 */
struct LiquidityChangeExecution {
  address baseAssetAddress;
  address quoteAssetAddress;
  uint64 liquidityInPips;
  // Gross amount including fees of base asset executed
  uint64 grossBaseQuantityInPips;
  // Gross amount including fees of quote asset executed
  uint64 grossQuoteQuantityInPips;
  // Net amount of base asset sent to pool for additions or received by wallet for removals
  uint64 netBaseQuantityInPips;
  // Net amount of quote asset sent to pool for additions or received by wallet for removals
  uint64 netQuoteQuantityInPips;
}

/**
 * @notice Internally used struct, argument type to `LiquidityPoolAdmin.migrateLiquidityPool`
 */
struct LiquidityMigration {
  address token0;
  address token1;
  bool isToken1Quote;
  uint256 desiredLiquidity;
  address to;
  IWETH9 WETH;
}

/**
 * @notice Internally used struct capturing wallet order nonce invalidations created via `invalidateOrderNonce`
 */
struct NonceInvalidation {
  bool exists;
  uint64 timestampInMs;
  uint256 effectiveBlockNumber;
}

/**
 * @notice Return type for `Exchange.loadAssetBySymbol`, and `Exchange.loadAssetByAddress`; also
 * used internally by `AssetRegistry`
 */
struct Asset {
  // Flag to distinguish from empty struct
  bool exists;
  // The asset's address
  address assetAddress;
  // The asset's symbol
  string symbol;
  // The asset's decimal precision
  uint8 decimals;
  // Flag set when asset registration confirmed. Asset deposits, trades, or withdrawals only
  // allowed if true
  bool isConfirmed;
  // Timestamp as ms since Unix epoch when isConfirmed was asserted
  uint64 confirmedTimestampInMs;
}

/**
 * @notice Argument type for `Exchange.executeOrderBookTrade` and `Hashing.getOrderWalletHash`
 */
struct Order {
  // Must equal `Constants.signatureHashVersion`
  uint8 signatureHashVersion;
  // UUIDv1 unique to wallet
  uint128 nonce;
  // Wallet address that placed order and signed hash
  address walletAddress;
  // Type of order
  OrderType orderType;
  // Order side wallet is on
  OrderSide side;
  // Order quantity in base or quote asset terms depending on isQuantityInQuote flag
  uint64 quantityInPips;
  // Is quantityInPips in quote terms
  bool isQuantityInQuote;
  // For limit orders, price in decimal pips * 10^8 in quote terms
  uint64 limitPriceInPips;
  // For stop orders, stop loss or take profit price in decimal pips * 10^8 in quote terms
  uint64 stopPriceInPips;
  // Optional custom client order ID
  string clientOrderId;
  // TIF option specified by wallet for order
  OrderTimeInForce timeInForce;
  // STP behavior specified by wallet for order
  OrderSelfTradePrevention selfTradePrevention;
  // Cancellation time specified by wallet for GTT TIF order
  uint64 cancelAfter;
  // The ECDSA signature of the order hash as produced by Hashing.getOrderWalletHash
  bytes walletSignature;
}

/**
 * @notice Argument type for `Exchange.executeOrderBookTrade` specifying execution parameters for matching orders
 */
struct OrderBookTrade {
  // Base asset symbol
  string baseAssetSymbol;
  // Quote asset symbol
  string quoteAssetSymbol;
  // Base asset address
  address baseAssetAddress;
  // Quote asset address
  address quoteAssetAddress;
  // Gross amount including fees of base asset executed
  uint64 grossBaseQuantityInPips;
  // Gross amount including fees of quote asset executed
  uint64 grossQuoteQuantityInPips;
  // Net amount of base asset received by buy side wallet after fees
  uint64 netBaseQuantityInPips;
  // Net amount of quote asset received by sell side wallet after fees
  uint64 netQuoteQuantityInPips;
  // Asset address for liquidity maker's fee
  address makerFeeAssetAddress;
  // Asset address for liquidity taker's fee
  address takerFeeAssetAddress;
  // Fee paid by liquidity maker
  uint64 makerFeeQuantityInPips;
  // Fee paid by liquidity taker, inclusive of gas fees
  uint64 takerFeeQuantityInPips;
  // Execution price of trade in decimal pips * 10^8 in quote terms
  uint64 priceInPips;
  // Which side of the order (buy or sell) the liquidity maker was on
  OrderSide makerSide;
}

/**
 * @notice Argument type for `Exchange.executePoolTrade` specifying execution parameters for an
 * order against pool liquidity
 */
struct PoolTrade {
  // Base asset symbol
  string baseAssetSymbol;
  // Quote asset symbol
  string quoteAssetSymbol;
  // Base asset address
  address baseAssetAddress;
  // Quote asset address
  address quoteAssetAddress;
  // Gross amount including fees of base asset executed
  uint64 grossBaseQuantityInPips;
  // Gross amount including fees of quote asset executed
  uint64 grossQuoteQuantityInPips;
  // If wallet is buy side, net amount of quote input to pool used to calculate output; otherwise,
  // net amount of base asset leaving pool
  uint64 netBaseQuantityInPips;
  // If wallet is buy side, net amount of base input to pool used to calculate output; otherwise,
  // net amount of quote asset leaving pool
  uint64 netQuoteQuantityInPips;
  // Fee paid by liquidity taker to pool from sent asset
  uint64 takerPoolFeeQuantityInPips;
  // Fee paid by liquidity taker to fee wallet from sent asset
  uint64 takerProtocolFeeQuantityInPips;
  // Fee paid by liquidity taker to fee wallet from received asset
  uint64 takerGasFeeQuantityInPips;
  // Fee paid by liquidity taker sell to pool taken from pool's quote asset output
  uint64 takerPriceCorrectionFeeQuantityInPips;
}

struct HybridTrade {
  OrderBookTrade orderBookTrade;
  PoolTrade poolTrade;
  // Fee paid by liquidity taker to fee wallet from received asset
  uint64 takerGasFeeQuantityInPips;
}

/**
 * @notice Argument type for `Exchange.withdraw` and `Hashing.getWithdrawalWalletHash`
 */
struct Withdrawal {
  // Distinguishes between withdrawals by asset symbol or address
  WithdrawalType withdrawalType;
  // UUIDv1 unique to wallet
  uint128 nonce;
  // Address of wallet to which funds will be returned
  address payable walletAddress;
  // Asset symbol
  string assetSymbol;
  // Asset address
  address assetAddress; // Used when assetSymbol not specified
  // Withdrawal quantity
  uint64 grossQuantityInPips;
  // Gas fee deducted from withdrawn quantity to cover dispatcher tx costs
  uint64 gasFeeInPips;
  // Not currently used but reserved for future use. Must be true
  bool autoDispatchEnabled;
  // The ECDSA signature of the withdrawal hash as produced by Hashing.getWithdrawalWalletHash
  bytes walletSignature;
}
