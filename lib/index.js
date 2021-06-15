"use strict";
exports.__esModule = true;
exports.loadGovernanceContract = exports.loadExchangeContract = exports.loadCustodianContract = exports.decimalToAssetUnits = exports.assetUnitsToPips = exports.pipsToAssetUnits = exports.decimalToPips = exports.uuidToHexString = exports.uuidToUint8Array = exports.getWithdrawArguments = exports.getPoolTradeArguments = exports.getHybridTradeArguments = exports.getTradeArguments = exports.getRemoveLiquidityArguments = exports.getAddLiquidityArguments = exports.getWithdrawalHash = exports.getOrderHash = exports.getLiquidityRemovalHash = exports.getLiquidityAdditionHash = exports.ethAddress = exports.OrderType = exports.OrderTimeInForce = exports.OrderSide = exports.OrderSelfTradePrevention = exports.LiquidityChangeType = exports.LiquidityChangeOrigination = exports.signatureHashVersion = exports.pipsDecimals = exports.contracts = void 0;
var bignumber_js_1 = require("bignumber.js");
var fs_1 = require("fs");
var path_1 = require("path");
var ethers_1 = require("ethers");
var contracts = require("./contracts");
exports.contracts = contracts;
/** The fixed number of digits following the decimal in quantities expressed as pips */
exports.pipsDecimals = 8;
exports.signatureHashVersion = 2;
var LiquidityChangeOrigination;
(function (LiquidityChangeOrigination) {
    LiquidityChangeOrigination[LiquidityChangeOrigination["OnChain"] = 0] = "OnChain";
    LiquidityChangeOrigination[LiquidityChangeOrigination["OffChain"] = 1] = "OffChain";
})(LiquidityChangeOrigination = exports.LiquidityChangeOrigination || (exports.LiquidityChangeOrigination = {}));
var LiquidityChangeType;
(function (LiquidityChangeType) {
    LiquidityChangeType[LiquidityChangeType["Addition"] = 0] = "Addition";
    LiquidityChangeType[LiquidityChangeType["Removal"] = 1] = "Removal";
})(LiquidityChangeType = exports.LiquidityChangeType || (exports.LiquidityChangeType = {}));
var OrderSelfTradePrevention;
(function (OrderSelfTradePrevention) {
    OrderSelfTradePrevention[OrderSelfTradePrevention["DecreaseAndCancel"] = 0] = "DecreaseAndCancel";
    OrderSelfTradePrevention[OrderSelfTradePrevention["CancelOldest"] = 1] = "CancelOldest";
    OrderSelfTradePrevention[OrderSelfTradePrevention["CancelNewest"] = 2] = "CancelNewest";
    OrderSelfTradePrevention[OrderSelfTradePrevention["CancelBoth"] = 3] = "CancelBoth";
})(OrderSelfTradePrevention = exports.OrderSelfTradePrevention || (exports.OrderSelfTradePrevention = {}));
var OrderSide;
(function (OrderSide) {
    OrderSide[OrderSide["Buy"] = 0] = "Buy";
    OrderSide[OrderSide["Sell"] = 1] = "Sell";
})(OrderSide = exports.OrderSide || (exports.OrderSide = {}));
var OrderTimeInForce;
(function (OrderTimeInForce) {
    OrderTimeInForce[OrderTimeInForce["GTC"] = 0] = "GTC";
    OrderTimeInForce[OrderTimeInForce["GTT"] = 1] = "GTT";
    OrderTimeInForce[OrderTimeInForce["IOC"] = 2] = "IOC";
    OrderTimeInForce[OrderTimeInForce["FOK"] = 3] = "FOK";
})(OrderTimeInForce = exports.OrderTimeInForce || (exports.OrderTimeInForce = {}));
var OrderType;
(function (OrderType) {
    OrderType[OrderType["Market"] = 0] = "Market";
    OrderType[OrderType["Limit"] = 1] = "Limit";
    OrderType[OrderType["LimitMaker"] = 2] = "LimitMaker";
    OrderType[OrderType["StopLoss"] = 3] = "StopLoss";
    OrderType[OrderType["StopLossLimit"] = 4] = "StopLossLimit";
    OrderType[OrderType["TakeProfit"] = 5] = "TakeProfit";
    OrderType[OrderType["TakeProfitLimit"] = 6] = "TakeProfitLimit";
})(OrderType = exports.OrderType || (exports.OrderType = {}));
var WithdrawalType;
(function (WithdrawalType) {
    WithdrawalType[WithdrawalType["BySymbol"] = 0] = "BySymbol";
    WithdrawalType[WithdrawalType["ByAddress"] = 1] = "ByAddress";
})(WithdrawalType || (WithdrawalType = {}));
exports.ethAddress = '0x0000000000000000000000000000000000000000';
var getLiquidityAdditionHash = function (addition) {
    return solidityHashOfParams([
        ['uint8', addition.signatureHashVersion],
        ['uint8', LiquidityChangeType.Addition],
        ['uint8', LiquidityChangeOrigination.OffChain],
        ['uint128', exports.uuidToUint8Array(addition.nonce)],
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
};
exports.getLiquidityAdditionHash = getLiquidityAdditionHash;
var getLiquidityRemovalHash = function (removal) {
    return solidityHashOfParams([
        ['uint8', removal.signatureHashVersion],
        ['uint8', LiquidityChangeType.Removal],
        ['uint8', LiquidityChangeOrigination.OffChain],
        ['uint128', exports.uuidToUint8Array(removal.nonce)],
        ['address', removal.wallet],
        ['address', removal.assetA],
        ['address', removal.assetB],
        ['uint256', removal.liquidity],
        ['uint256', removal.amountAMin],
        ['uint256', removal.amountBMin],
        ['address', removal.to],
        ['uint256', removal.deadline.toString()],
    ]);
};
exports.getLiquidityRemovalHash = getLiquidityRemovalHash;
var getOrderHash = function (order) {
    return solidityHashOfParams([
        ['uint8', order.signatureHashVersion],
        ['uint128', exports.uuidToUint8Array(order.nonce)],
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
};
exports.getOrderHash = getOrderHash;
var getWithdrawalHash = function (withdrawal) {
    if ((withdrawal.asset && withdrawal.assetContractAddress) ||
        (!withdrawal.asset && !withdrawal.assetContractAddress)) {
        throw new Error('Withdrawal must specify exactly one of asset or assetContractAddress');
    }
    return solidityHashOfParams([
        ['uint128', exports.uuidToUint8Array(withdrawal.nonce)],
        ['address', withdrawal.wallet],
        withdrawal.asset
            ? ['string', withdrawal.asset]
            : ['address', withdrawal.assetContractAddress],
        ['string', withdrawal.quantity],
        ['bool', true],
    ]);
};
exports.getWithdrawalHash = getWithdrawalHash;
var getAddLiquidityArguments = function (addition, walletSignature, execution) {
    return [
        {
            signatureHashVersion: addition.signatureHashVersion,
            origination: LiquidityChangeOrigination.OffChain,
            nonce: exports.uuidToHexString(addition.nonce),
            wallet: addition.wallet,
            assetA: addition.assetA,
            assetB: addition.assetB,
            amountADesired: addition.amountADesired,
            amountBDesired: addition.amountBDesired,
            amountAMin: addition.amountAMin,
            amountBMin: addition.amountBMin,
            to: addition.to,
            deadline: addition.deadline,
            signature: walletSignature
        },
        execution,
    ];
};
exports.getAddLiquidityArguments = getAddLiquidityArguments;
var getRemoveLiquidityArguments = function (removal, walletSignature, execution) {
    return [
        {
            signatureHashVersion: removal.signatureHashVersion,
            origination: LiquidityChangeOrigination.OffChain,
            nonce: exports.uuidToHexString(removal.nonce),
            wallet: removal.wallet,
            assetA: removal.assetA,
            assetB: removal.assetB,
            liquidity: removal.liquidity,
            amountAMin: removal.amountAMin,
            amountBMin: removal.amountBMin,
            to: removal.to,
            deadline: removal.deadline,
            signature: walletSignature
        },
        execution,
    ];
};
exports.getRemoveLiquidityArguments = getRemoveLiquidityArguments;
var getTradeArguments = function (buyOrder, buyWalletSignature, sellOrder, sellWalletSignature, trade) {
    return [
        orderToArgumentStruct(buyOrder, buyWalletSignature),
        orderToArgumentStruct(sellOrder, sellWalletSignature),
        tradeToArgumentStruct(trade, buyOrder),
    ];
};
exports.getTradeArguments = getTradeArguments;
var getHybridTradeArguments = function (buyOrder, buyWalletSignature, sellOrder, sellWalletSignature, trade, poolTrade, takerGasFeeQuantity) {
    if (takerGasFeeQuantity === void 0) { takerGasFeeQuantity = '0.00000000'; }
    return [
        orderToArgumentStruct(buyOrder, buyWalletSignature),
        orderToArgumentStruct(sellOrder, sellWalletSignature),
        {
            orderBookTrade: tradeToArgumentStruct(trade, buyOrder),
            poolTrade: poolTradeToArgumentStruct(poolTrade, buyOrder),
            takerGasFeeQuantityInPips: exports.decimalToPips(takerGasFeeQuantity)
        },
    ];
};
exports.getHybridTradeArguments = getHybridTradeArguments;
var getPoolTradeArguments = function (order, walletSignature, poolTrade) {
    return [
        orderToArgumentStruct(order, walletSignature),
        poolTradeToArgumentStruct(poolTrade, order),
    ];
};
exports.getPoolTradeArguments = getPoolTradeArguments;
var getWithdrawArguments = function (withdrawal, gasFee, walletSignature) {
    return [
        {
            withdrawalType: withdrawal.asset
                ? WithdrawalType.BySymbol
                : WithdrawalType.ByAddress,
            nonce: exports.uuidToHexString(withdrawal.nonce),
            walletAddress: withdrawal.wallet,
            assetSymbol: withdrawal.asset || '',
            assetAddress: withdrawal.assetContractAddress || exports.ethAddress,
            grossQuantityInPips: exports.decimalToPips(withdrawal.quantity),
            gasFeeInPips: exports.decimalToPips(gasFee),
            autoDispatchEnabled: true,
            walletSignature: walletSignature
        },
    ];
};
exports.getWithdrawArguments = getWithdrawArguments;
var orderToArgumentStruct = function (o, walletSignature) {
    return {
        signatureHashVersion: o.signatureHashVersion,
        nonce: exports.uuidToHexString(o.nonce),
        walletAddress: o.wallet,
        orderType: o.type,
        side: o.side,
        quantityInPips: exports.decimalToPips(o.quantity),
        isQuantityInQuote: o.isQuantityInQuote,
        limitPriceInPips: exports.decimalToPips(o.price || '0'),
        stopPriceInPips: exports.decimalToPips(o.stopPrice || '0'),
        clientOrderId: o.clientOrderId || '',
        timeInForce: o.timeInForce || 0,
        selfTradePrevention: o.selfTradePrevention || 0,
        cancelAfter: o.cancelAfter || 0,
        walletSignature: walletSignature
    };
};
var tradeToArgumentStruct = function (t, order) {
    return {
        baseAssetSymbol: order.market.split('-')[0],
        quoteAssetSymbol: order.market.split('-')[1],
        baseAssetAddress: t.baseAssetAddress,
        quoteAssetAddress: t.quoteAssetAddress,
        grossBaseQuantityInPips: exports.decimalToPips(t.grossBaseQuantity),
        grossQuoteQuantityInPips: exports.decimalToPips(t.grossQuoteQuantity),
        netBaseQuantityInPips: exports.decimalToPips(t.netBaseQuantity),
        netQuoteQuantityInPips: exports.decimalToPips(t.netQuoteQuantity),
        makerFeeAssetAddress: t.makerFeeAssetAddress,
        takerFeeAssetAddress: t.takerFeeAssetAddress,
        makerFeeQuantityInPips: exports.decimalToPips(t.makerFeeQuantity),
        takerFeeQuantityInPips: exports.decimalToPips(t.takerFeeQuantity),
        priceInPips: exports.decimalToPips(t.price),
        makerSide: t.makerSide
    };
};
var poolTradeToArgumentStruct = function (p, order) {
    return {
        baseAssetSymbol: order.market.split('-')[0],
        quoteAssetSymbol: order.market.split('-')[1],
        baseAssetAddress: p.baseAssetAddress,
        quoteAssetAddress: p.quoteAssetAddress,
        grossBaseQuantityInPips: exports.decimalToPips(p.grossBaseQuantity),
        grossQuoteQuantityInPips: exports.decimalToPips(p.grossQuoteQuantity),
        netBaseQuantityInPips: exports.decimalToPips(p.netBaseQuantity),
        netQuoteQuantityInPips: exports.decimalToPips(p.netQuoteQuantity),
        takerPoolFeeQuantityInPips: exports.decimalToPips(p.takerPoolFeeQuantity),
        takerProtocolFeeQuantityInPips: exports.decimalToPips(p.takerProtocolFeeQuantity),
        takerGasFeeQuantityInPips: exports.decimalToPips(p.takerGasFeeQuantity)
    };
};
var solidityHashOfParams = function (params) {
    var fields = params.map(function (param) { return param[0]; });
    var values = params.map(function (param) { return param[1]; });
    return ethers_1.ethers.utils.solidityKeccak256(fields, values);
};
var uuidToUint8Array = function (uuid) {
    return ethers_1.ethers.utils.arrayify(exports.uuidToHexString(uuid));
};
exports.uuidToUint8Array = uuidToUint8Array;
var uuidToHexString = function (uuid) {
    return "0x" + uuid.replace(/-/g, '');
};
exports.uuidToHexString = uuidToHexString;
/**
 * Convert decimal quantity string to integer pips as expected by contract structs. Truncates
 * anything beyond 8 decimals
 */
var decimalToPips = function (decimal) {
    return new bignumber_js_1["default"](decimal)
        .shiftedBy(8)
        .integerValue(bignumber_js_1["default"].ROUND_DOWN)
        .toFixed(0);
};
exports.decimalToPips = decimalToPips;
/**
 * Convert pips to native token quantity, taking the nunmber of decimals into account
 */
var pipsToAssetUnits = function (pips, decimals) {
    return new bignumber_js_1["default"](pips)
        .shiftedBy(decimals - 8) // This is still correct when decimals < 8
        .integerValue(bignumber_js_1["default"].ROUND_DOWN)
        .toFixed(0);
};
exports.pipsToAssetUnits = pipsToAssetUnits;
/**
 * Convert pips to native token quantity, taking the nunmber of decimals into account
 */
var assetUnitsToPips = function (assetUnits, decimals) {
    return new bignumber_js_1["default"](assetUnits)
        .shiftedBy(8 - decimals) // This is still correct when decimals > 8
        .integerValue(bignumber_js_1["default"].ROUND_DOWN)
        .toString();
};
exports.assetUnitsToPips = assetUnitsToPips;
var decimalToAssetUnits = function (decimal, decimals) { return exports.pipsToAssetUnits(exports.decimalToPips(decimal), decimals); };
exports.decimalToAssetUnits = decimalToAssetUnits;
var loadCustodianContract = function () {
    return loadContract('Custodian');
};
exports.loadCustodianContract = loadCustodianContract;
var loadExchangeContract = function () {
    return loadContract('Exchange');
};
exports.loadExchangeContract = loadExchangeContract;
var loadGovernanceContract = function () {
    return loadContract('Governance');
};
exports.loadGovernanceContract = loadGovernanceContract;
var _compiledContractMap = new Map();
var loadContract = function (filename) {
    if (!_compiledContractMap.has(filename)) {
        var _a = JSON.parse(fs_1["default"]
            .readFileSync(path_1["default"].join(__dirname, '..', 'contracts', filename + ".json"))
            .toString('utf8')), abi = _a.abi, bytecode = _a.bytecode;
        _compiledContractMap.set(filename, { abi: abi, bytecode: bytecode });
    }
    return _compiledContractMap.get(filename); // Will never be undefined as it gets set above
};
