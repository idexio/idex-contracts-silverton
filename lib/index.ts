import BigNumber from 'bignumber.js';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

import { ExchangeV31Instance } from '../types/truffle-contracts';

import * as contracts from './contracts';

export { contracts };

export const nativeAssetSymbol = 'BNB';

/** The fixed number of digits following the decimal in quantities expressed as pips */
export const pipsDecimals = 8;

export const signatureHashVersion = 4;

export enum LiquidityChangeOrigination {
  OnChain,
  OffChain,
}
export enum LiquidityChangeType {
  Addition,
  Removal,
}
export enum OrderSelfTradePrevention {
  DecreaseAndCancel,
  CancelOldest,
  CancelNewest,
  CancelBoth,
}
export enum OrderSide {
  Buy,
  Sell,
}
export enum OrderTimeInForce {
  GTC,
  GTT,
  IOC,
  FOK,
}
export enum OrderType {
  Market,
  Limit,
  LimitMaker,
  StopLoss,
  StopLossLimit,
  TakeProfit,
  TakeProfitLimit,
}
enum WithdrawalType {
  BySymbol,
  ByAddress,
}

export interface LiquidityAddition {
  signatureHashVersion: number;
  nonce: string;
  wallet: string;
  assetA: string;
  assetB: string;
  amountADesired: string;
  amountBDesired: string;
  amountAMin: string;
  amountBMin: string;
  to: string;
  deadline: number;
}
export interface LiquidityRemoval {
  signatureHashVersion: number;
  nonce: string;
  wallet: string;
  assetA: string;
  assetB: string;
  liquidity: string;
  amountAMin: string;
  amountBMin: string;
  to: string;
  deadline: number;
}
export interface Order {
  signatureHashVersion: number;
  nonce: string;
  wallet: string;
  market: string;
  type: OrderType;
  side: OrderSide;
  timeInForce?: OrderTimeInForce;
  quantity: string;
  isQuantityInQuote: boolean;
  price: string;
  stopPrice?: string;
  clientOrderId?: string;
  selfTradePrevention?: OrderSelfTradePrevention;
  cancelAfter?: number;
}
export interface PoolTrade {
  baseAssetAddress: string;
  quoteAssetAddress: string;
  grossBaseQuantity: string;
  grossQuoteQuantity: string;
  netBaseQuantity: string;
  netQuoteQuantity: string;
  takerPoolFeeQuantity: string;
  takerProtocolFeeQuantity: string;
  takerGasFeeQuantity: string;
  takerPriceCorrectionFeeQuantity: string;
}
export interface Trade {
  baseAssetAddress: string;
  quoteAssetAddress: string;
  grossBaseQuantity: string;
  grossQuoteQuantity: string;
  netBaseQuantity: string;
  netQuoteQuantity: string;
  makerFeeAssetAddress: string;
  takerFeeAssetAddress: string;
  makerFeeQuantity: string;
  takerFeeQuantity: string;
  price: string;
  makerSide: OrderSide;
}
export interface Withdrawal {
  nonce: string;
  wallet: string;
  quantity: string; // Decimal string
  autoDispatchEnabled: boolean; // Currently has no effect
  asset?: string;
  assetContractAddress?: string;
}

export const ethAddress = '0x0000000000000000000000000000000000000000';

export const liquidityProviderTokenDecimals = 18;

export const getLiquidityAdditionHash = (addition: LiquidityAddition): string =>
  solidityHashOfParams([
    ['uint8', addition.signatureHashVersion], // Signature hash version - only version 2 supported
    ['uint8', LiquidityChangeType.Addition],
    ['uint8', LiquidityChangeOrigination.OffChain],
    ['uint128', uuidToUint8Array(addition.nonce)],
    ['address', addition.wallet],
    ['address', addition.assetA],
    ['address', addition.assetB],
    ['uint256', addition.amountADesired],
    ['uint256', addition.amountBDesired],
    ['uint256', addition.amountAMin],
    ['uint256', addition.amountBMin],
    ['address', addition.to],
    ['uint256', addition.deadline.toString()],
  ]);

export const getLiquidityRemovalHash = (removal: LiquidityRemoval): string =>
  solidityHashOfParams([
    ['uint8', removal.signatureHashVersion], // Signature hash version - only version 2 supported
    ['uint8', LiquidityChangeType.Removal],
    ['uint8', LiquidityChangeOrigination.OffChain],
    ['uint128', uuidToUint8Array(removal.nonce)],
    ['address', removal.wallet],
    ['address', removal.assetA],
    ['address', removal.assetB],
    ['uint256', removal.liquidity],
    ['uint256', removal.amountAMin],
    ['uint256', removal.amountBMin],
    ['address', removal.to],
    ['uint256', removal.deadline.toString()],
  ]);

export const getOrderHash = (order: Order): string =>
  solidityHashOfParams([
    ['uint8', order.signatureHashVersion], // Signature hash version - only version 2 supported
    ['uint128', uuidToUint8Array(order.nonce)],
    ['address', order.wallet],
    ['string', order.market],
    ['uint8', order.type],
    ['uint8', order.side],
    ['string', order.quantity],
    ['bool', order.isQuantityInQuote],
    ['string', order.price || ''],
    ['string', order.stopPrice || ''],
    ['string', order.clientOrderId || ''],
    ['uint8', order.timeInForce || 0],
    ['uint8', order.selfTradePrevention || 0],
    ['uint64', order.cancelAfter || 0],
  ]);

export const getWithdrawalHash = (withdrawal: Withdrawal): string => {
  if (
    (withdrawal.asset && withdrawal.assetContractAddress) ||
    (!withdrawal.asset && !withdrawal.assetContractAddress)
  ) {
    throw new Error(
      'Withdrawal must specify exactly one of asset or assetContractAddress',
    );
  }

  return solidityHashOfParams([
    ['uint128', uuidToUint8Array(withdrawal.nonce)],
    ['address', withdrawal.wallet],
    withdrawal.asset
      ? ['string', withdrawal.asset]
      : ['address', withdrawal.assetContractAddress as string],
    ['string', withdrawal.quantity],
    ['bool', true], // autoDispatchEnabled
  ]);
};

export const getAddLiquidityArguments = (
  addition: LiquidityAddition,
  walletSignature: string,
  execution: ExchangeV31Instance['executeAddLiquidity']['arguments'][1],
): ExchangeV31Instance['executeAddLiquidity']['arguments'] => {
  return [
    {
      signatureHashVersion: addition.signatureHashVersion,
      origination: LiquidityChangeOrigination.OffChain,
      nonce: uuidToHexString(addition.nonce),
      wallet: addition.wallet,
      assetA: addition.assetA,
      assetB: addition.assetB,
      amountADesired: addition.amountADesired,
      amountBDesired: addition.amountBDesired,
      amountAMin: addition.amountAMin,
      amountBMin: addition.amountBMin,
      to: addition.to,
      deadline: addition.deadline,
      signature: walletSignature,
    },
    execution,
  ];
};

export const getRemoveLiquidityArguments = (
  removal: LiquidityRemoval,
  walletSignature: string,
  execution: ExchangeV31Instance['executeRemoveLiquidity']['arguments'][1],
): ExchangeV31Instance['executeRemoveLiquidity']['arguments'] => {
  return [
    {
      signatureHashVersion: removal.signatureHashVersion,
      origination: LiquidityChangeOrigination.OffChain,
      nonce: uuidToHexString(removal.nonce),
      wallet: removal.wallet,
      assetA: removal.assetA,
      assetB: removal.assetB,
      liquidity: removal.liquidity,
      amountAMin: removal.amountAMin,
      amountBMin: removal.amountBMin,
      to: removal.to,
      deadline: removal.deadline,
      signature: walletSignature,
    },
    execution,
  ];
};

export const getTradeArguments = (
  buyOrder: Order,
  buyWalletSignature: string,
  sellOrder: Order,
  sellWalletSignature: string,
  trade: Trade,
): ExchangeV31Instance['executeOrderBookTrade']['arguments'] => {
  return [
    orderToArgumentStruct(buyOrder, buyWalletSignature),
    orderToArgumentStruct(sellOrder, sellWalletSignature),
    tradeToArgumentStruct(trade, buyOrder),
  ] as const;
};

export const getHybridTradeArguments = (
  buyOrder: Order,
  buyWalletSignature: string,
  sellOrder: Order,
  sellWalletSignature: string,
  trade: Trade,
  poolTrade: PoolTrade,
  takerGasFeeQuantity = '0.00000000',
): ExchangeV31Instance['executeHybridTrade']['arguments'] => {
  return [
    orderToArgumentStruct(buyOrder, buyWalletSignature),
    orderToArgumentStruct(sellOrder, sellWalletSignature),
    {
      orderBookTrade: tradeToArgumentStruct(trade, buyOrder),
      poolTrade: poolTradeToArgumentStruct(poolTrade, buyOrder),
      takerGasFeeQuantityInPips: decimalToPips(takerGasFeeQuantity),
    },
  ] as const;
};

export const getPoolTradeArguments = (
  order: Order,
  walletSignature: string,
  poolTrade: PoolTrade,
): ExchangeV31Instance['executePoolTrade']['arguments'] => {
  return [
    orderToArgumentStruct(order, walletSignature),
    poolTradeToArgumentStruct(poolTrade, order),
  ] as const;
};

export const getWithdrawArguments = (
  withdrawal: Withdrawal,
  gasFee: string,
  walletSignature: string,
): ExchangeV31Instance['withdraw']['arguments'] => {
  return [
    {
      withdrawalType: withdrawal.asset
        ? WithdrawalType.BySymbol
        : WithdrawalType.ByAddress,
      nonce: uuidToHexString(withdrawal.nonce),
      walletAddress: withdrawal.wallet,
      assetSymbol: withdrawal.asset || '',
      assetAddress: withdrawal.assetContractAddress || ethAddress,
      grossQuantityInPips: decimalToPips(withdrawal.quantity),
      gasFeeInPips: decimalToPips(gasFee),
      autoDispatchEnabled: true,
      walletSignature,
    },
  ];
};

const orderToArgumentStruct = (o: Order, walletSignature: string) => {
  return {
    signatureHashVersion: o.signatureHashVersion,
    nonce: uuidToHexString(o.nonce),
    walletAddress: o.wallet,
    orderType: o.type,
    side: o.side,
    quantityInPips: decimalToPips(o.quantity),
    isQuantityInQuote: o.isQuantityInQuote,
    limitPriceInPips: decimalToPips(o.price || '0'),
    stopPriceInPips: decimalToPips(o.stopPrice || '0'),
    clientOrderId: o.clientOrderId || '',
    timeInForce: o.timeInForce || 0,
    selfTradePrevention: o.selfTradePrevention || 0,
    cancelAfter: o.cancelAfter || 0,
    walletSignature,
  };
};

const tradeToArgumentStruct = (t: Trade, order: Order) => {
  return {
    baseAssetSymbol: order.market.split('-')[0],
    quoteAssetSymbol: order.market.split('-')[1],
    baseAssetAddress: t.baseAssetAddress,
    quoteAssetAddress: t.quoteAssetAddress,
    grossBaseQuantityInPips: decimalToPips(t.grossBaseQuantity),
    grossQuoteQuantityInPips: decimalToPips(t.grossQuoteQuantity),
    netBaseQuantityInPips: decimalToPips(t.netBaseQuantity),
    netQuoteQuantityInPips: decimalToPips(t.netQuoteQuantity),
    makerFeeAssetAddress: t.makerFeeAssetAddress,
    takerFeeAssetAddress: t.takerFeeAssetAddress,
    makerFeeQuantityInPips: decimalToPips(t.makerFeeQuantity),
    takerFeeQuantityInPips: decimalToPips(t.takerFeeQuantity),
    priceInPips: decimalToPips(t.price),
    makerSide: t.makerSide,
  };
};

const poolTradeToArgumentStruct = (p: PoolTrade, order: Order) => {
  return {
    baseAssetSymbol: order.market.split('-')[0],
    quoteAssetSymbol: order.market.split('-')[1],
    baseAssetAddress: p.baseAssetAddress,
    quoteAssetAddress: p.quoteAssetAddress,
    grossBaseQuantityInPips: decimalToPips(p.grossBaseQuantity),
    grossQuoteQuantityInPips: decimalToPips(p.grossQuoteQuantity),
    netBaseQuantityInPips: decimalToPips(p.netBaseQuantity),
    netQuoteQuantityInPips: decimalToPips(p.netQuoteQuantity),
    takerPoolFeeQuantityInPips: decimalToPips(p.takerPoolFeeQuantity),
    takerProtocolFeeQuantityInPips: decimalToPips(p.takerProtocolFeeQuantity),
    takerGasFeeQuantityInPips: decimalToPips(p.takerGasFeeQuantity),
    takerPriceCorrectionFeeQuantityInPips: decimalToPips(
      p.takerPriceCorrectionFeeQuantity,
    ),
  };
};

type TypeValuePair =
  | ['string' | 'address', string]
  | ['uint128' | 'uint256', string | Uint8Array]
  | ['uint8' | 'uint64', number]
  | ['bool', boolean];

const solidityHashOfParams = (params: TypeValuePair[]): string => {
  const fields = params.map((param) => param[0]);
  const values = params.map((param) => param[1]);
  return ethers.utils.solidityKeccak256(fields, values);
};

export const uuidToUint8Array = (uuid: string): Uint8Array =>
  ethers.utils.arrayify(uuidToHexString(uuid));

export const uuidToHexString = (uuid: string): string =>
  `0x${uuid.replace(/-/g, '')}`;

/**
 * Convert decimal quantity string to integer pips as expected by contract structs. Truncates
 * anything beyond 8 decimals
 */
export const decimalToPips = (decimal: string): string =>
  new BigNumber(decimal)
    .shiftedBy(8)
    .integerValue(BigNumber.ROUND_DOWN)
    .toFixed(0);

/**
 * Convert pips to native token quantity, taking the nunmber of decimals into account
 */
export const pipsToAssetUnits = (pips: string, decimals: number): string =>
  new BigNumber(pips)
    .shiftedBy(decimals - 8) // This is still correct when decimals < 8
    .integerValue(BigNumber.ROUND_DOWN)
    .toFixed(0);

/**
 * Convert pips to native token quantity, taking the nunmber of decimals into account
 */
export const assetUnitsToPips = (
  assetUnits: string,
  decimals: number,
): string =>
  new BigNumber(assetUnits)
    .shiftedBy(8 - decimals) // This is still correct when decimals > 8
    .integerValue(BigNumber.ROUND_DOWN)
    .toFixed(0);

export const decimalToAssetUnits = (
  decimal: string,
  decimals: number,
): string => pipsToAssetUnits(decimalToPips(decimal), decimals);

// TODO The below are provided as support for legacy CLI commands

export type LoadContractResult = {
  abi: any[];
  bytecode: string;
};

export const loadCustodianContract = (): LoadContractResult =>
  loadContract('Custodian');

export const loadExchangeContract = (): LoadContractResult =>
  loadContract('Exchange');

export const loadGovernanceContract = (): LoadContractResult =>
  loadContract('Governance');

const _compiledContractMap = new Map<string, LoadContractResult>();
const loadContract = (
  filename: 'Custodian' | 'Exchange' | 'Governance',
): LoadContractResult => {
  if (!_compiledContractMap.has(filename)) {
    const { abi, bytecode } = JSON.parse(
      fs
        .readFileSync(
          path.join(__dirname, '..', 'contracts', `${filename}.json`),
        )
        .toString('utf8'),
    );
    _compiledContractMap.set(filename, { abi, bytecode });
  }
  return _compiledContractMap.get(filename) as LoadContractResult; // Will never be undefined as it gets set above
};
