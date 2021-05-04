// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

/**
 * @notice Enums definitions
 */

// Liquidity pools //
enum LiquidityAdditionType { InitiatedOnChain, InitiatedOffChain }

enum LiquidityChangeType { Addition, Removal }

enum LiquidityChangeState { NotInitiated, Initiated, Executed }

// Order book //

enum OrderSelfTradePrevention {
  // Decrement and cancel
  dc,
  // Cancel oldest
  co,
  // Cancel newest
  cn,
  // Cancel both
  cb
}

enum OrderSide { Buy, Sell }

enum OrderTimeInForce {
  // Good until cancelled
  gtc,
  // Good until time
  gtt,
  // Immediate or cancel
  ioc,
  // Fill or kill
  fok
}

enum OrderType {
  Market,
  Limit,
  LimitMaker,
  StopLoss,
  StopLossLimit,
  TakeProfit,
  TakeProfitLimit
}

// Withdrawals //

enum WithdrawalType { BySymbol, ByAddress }
