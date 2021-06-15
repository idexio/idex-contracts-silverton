"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var bignumber_js_1 = require("bignumber.js");
var uuid_1 = require("uuid");
var trade_test_1 = require("./trade.test");
var lib_1 = require("../../lib");
var liquidity_pools_test_1 = require("./liquidity-pools.test");
var helpers_1 = require("./helpers");
var token0Symbol = 'DIL';
var ethMarketSymbol = token0Symbol + "-" + helpers_1.ethSymbol;
contract('Exchange (liquidity pools)', function (_a) {
    var ownerWallet = _a[0], buyWallet = _a[1], sellWallet = _a[2];
    describe('executePoolTrade', function () {
        it('should work with no fees for taker buy', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, deposit(exchange, token, buyWallet, '0.00000000', '1.00000000')];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '909.09090909', '0.00121000')];
                    case 4:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        poolTrade.netQuoteQuantity = '1.00000000';
                        poolTrade.grossQuoteQuantity = '1.00000000';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 5:
                        buySignature = _c.sent();
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work with fees for taker buy', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, deposit(exchange, token, buyWallet, '0.00000000', '1.00000000')];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '909.09090909', '0.00121000')];
                    case 4:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        poolTrade.netQuoteQuantity = '0.99800000'; // No protocol fee
                        poolTrade.grossQuoteQuantity = '1.00000000';
                        poolTrade.netBaseQuantity = '907.4277159';
                        poolTrade.takerPoolFeeQuantity = '0.00200000';
                        poolTrade.takerGasFeeQuantity = '0.01000000';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 5:
                        buySignature = _c.sent();
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work with no fees for taker sell', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, sellOrder, poolTrade, sellSignature;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, token.transfer(sellWallet, lib_1.decimalToAssetUnits('5000.00000000', 18))];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, deposit(exchange, token, sellWallet, '5000.00000000', '0.00000000')];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, sellWallet, '1111.11111112', '0.00081000')];
                    case 5:
                        _b = _c.sent(), sellOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        sellOrder.side = lib_1.OrderSide.Sell;
                        poolTrade.netQuoteQuantity = '1.00000000';
                        poolTrade.grossQuoteQuantity = '1.00000000';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(sellOrder), sellWallet)];
                    case 6:
                        sellSignature = _c.sent();
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(sellOrder, sellSignature, poolTrade))];
                    case 7:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalidated nonce', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, error, e_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid_1.v1({ msecs: new Date().getTime() + 100000 })), { from: buyWallet })];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '1.00000000', '0.10000000')];
                    case 4:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 5:
                        buySignature = _c.sent();
                        _c.label = 6;
                    case 6:
                        _c.trys.push([6, 8, , 9]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 7:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_1 = _c.sent();
                        error = e_1;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/order nonce timestamp too low/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for exited wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, error, e_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, exchange.exitWallet({ from: buyWallet })];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '1.00000000', '0.10000000')];
                    case 4:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 5:
                        buySignature = _c.sent();
                        _c.label = 6;
                    case 6:
                        _c.trys.push([6, 8, , 9]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 7:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_2 = _c.sent();
                        error = e_2;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/order wallet exit finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for decreasing constant product', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, error, e_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, deposit(exchange, token, buyWallet, '0.00000000', '10.00000000')];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '10.00000000', '0.00100000')];
                    case 4:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 5:
                        buySignature = _c.sent();
                        _c.label = 6;
                    case 6:
                        _c.trys.push([6, 8, , 9]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 7:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_3 = _c.sent();
                        error = e_3;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/constant product cannot decrease/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for duplicate trade pair', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, error, e_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '1.00000000', '0.10000000')];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        poolTrade.baseAssetAddress = poolTrade.quoteAssetAddress;
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 4:
                        buySignature = _c.sent();
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_4 = _c.sent();
                        error = e_4;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/assets must be different/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for symbol address mismatch', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, pair, token, _b, buyOrder, poolTrade, buySignature, error, e_5;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, pair = _a.pair, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '1.00000000', '0.10000000')];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        poolTrade.baseAssetAddress = pair.address;
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 4:
                        buySignature = _c.sent();
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_5 = _c.sent();
                        error = e_5;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/symbol address mismatch/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when base quantity is zero', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, error, e_6;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '1.00000000', '0.10000000')];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        poolTrade.grossBaseQuantity = '0';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 4:
                        buySignature = _c.sent();
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_6 = _c.sent();
                        error = e_6;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/base quantity must be greater than zero/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when quote quantity is zero', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, error, e_7;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '1.00000000', '0.10000000')];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        poolTrade.grossQuoteQuantity = '0';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 4:
                        buySignature = _c.sent();
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_7 = _c.sent();
                        error = e_7;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/quote quantity must be greater than zero/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when buy limit price exceeded', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, error, e_8;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '1.00000000', '0.10000000')];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        poolTrade.grossBaseQuantity = '0.50000000';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 4:
                        buySignature = _c.sent();
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_8 = _c.sent();
                        error = e_8;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/buy order limit price exceeded/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when sell limit price exceeded', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, sellOrder, poolTrade, sellSignature, error, e_9;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, sellWallet, '1.00000000', '0.10000000')];
                    case 3:
                        _b = _c.sent(), sellOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        sellOrder.side = lib_1.OrderSide.Sell;
                        poolTrade.grossBaseQuantity = '1.50000000';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(sellOrder), sellWallet)];
                    case 4:
                        sellSignature = _c.sent();
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(sellOrder, sellSignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_9 = _c.sent();
                        error = e_9;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/sell order limit price exceeded/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for excessive base fee', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, error, e_10;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '1.00000000', '0.10000000')];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        poolTrade.netBaseQuantity = '0.50000000';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 4:
                        buySignature = _c.sent();
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_10 = _c.sent();
                        error = e_10;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/excessive base fee/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for excessive quote fee', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, error, e_11;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '1.00000000', '0.10000000')];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        poolTrade.netQuoteQuantity = '0.05000000';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 4:
                        buySignature = _c.sent();
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_11 = _c.sent();
                        error = e_11;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/excessive quote fee/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when net quote plus taker fee not equal to gross', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, error, e_12;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '1.00000000', '0.10000000')];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        poolTrade.netQuoteQuantity = '0.0980000';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 4:
                        buySignature = _c.sent();
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_12 = _c.sent();
                        error = e_12;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/quote fees unbalanced/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when net base plus taker fee not equal to gross', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, sellOrder, poolTrade, sellSignature, error, e_13;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, sellWallet, '1.00000000', '0.10000000')];
                    case 3:
                        _b = _c.sent(), sellOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        sellOrder.side = lib_1.OrderSide.Sell;
                        poolTrade.netBaseQuantity = '0.90000000';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(sellOrder), sellWallet)];
                    case 4:
                        sellSignature = _c.sent();
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(sellOrder, sellSignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_13 = _c.sent();
                        error = e_13;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/base fees unbalanced/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when order signature invalid', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, error, e_14;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '1.00000000', '0.10000000')];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 4:
                        buySignature = _c.sent();
                        buyOrder.quantity = '1.00100000';
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executePoolTrade.apply(exchange, lib_1.getPoolTradeArguments(buyOrder, buySignature, poolTrade))];
                    case 6:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_14 = _c.sent();
                        error = e_14;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid wallet signature/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('executeHybridTrade', function () {
        it('should work with no fees', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _b.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, deposit(exchange, token, buyWallet, '0.00000000', '10.00000000')];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, token.transfer(sellWallet, lib_1.decimalToAssetUnits('5000.00000000', 18))];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, deposit(exchange, token, sellWallet, '5000.00000000', '0.00000000')];
                    case 5:
                        _b.sent();
                        return [4 /*yield*/, generateAndExecuteHybridTrade(exchange, token, buyWallet, sellWallet, web3)];
                    case 6:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work with fees', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, deposit(exchange, token, buyWallet, '0.00000000', '10.00000000')];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, token.transfer(sellWallet, lib_1.decimalToAssetUnits('5000.00000000', 18))];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, deposit(exchange, token, sellWallet, '5000.00000000', '0.00000000')];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, generateHybridTrade(token, buyWallet, sellWallet, web3)];
                    case 6:
                        _b = _c.sent(), buyOrder = _b.buyOrder, buySignature = _b.buySignature, sellOrder = _b.sellOrder, sellSignature = _b.sellSignature, fill = _b.fill, poolTrade = _b.poolTrade;
                        poolTrade.netQuoteQuantity = '0.99800000'; // No protocol fee
                        poolTrade.grossQuoteQuantity = '1.00000000';
                        poolTrade.netBaseQuantity = '907.4277159';
                        poolTrade.takerPoolFeeQuantity = '0.00200000';
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executeHybridTrade.apply(exchange, lib_1.getHybridTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade, '0.01000000'))];
                    case 7:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work for taker sell order', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, _c, sellOrder, fill, sellSignature;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _d.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _d.sent();
                        return [4 /*yield*/, deposit(exchange, token, buyWallet, '0.00000000', '10.00000000')];
                    case 3:
                        _d.sent();
                        return [4 /*yield*/, token.transfer(sellWallet, lib_1.decimalToAssetUnits('5000.00000000', 18))];
                    case 4:
                        _d.sent();
                        return [4 /*yield*/, deposit(exchange, token, sellWallet, '5000.00000000', '0.00000000')];
                    case 5:
                        _d.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '2222.22222224', '0.00081000')];
                    case 6:
                        _b = _d.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        buyOrder.quantity = '1111.11111112';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 7:
                        buySignature = _d.sent();
                        poolTrade.netQuoteQuantity = '1.000000000';
                        poolTrade.grossQuoteQuantity = '1.000000000';
                        poolTrade.netBaseQuantity = '1111.11111112';
                        poolTrade.grossBaseQuantity = '1111.11111112';
                        return [4 /*yield*/, trade_test_1.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet, '1111.11111112', '0.00081000', ethMarketSymbol)];
                    case 8:
                        _c = _d.sent(), sellOrder = _c.sellOrder, fill = _c.fill;
                        sellOrder.quantity = '2222.22222224';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(sellOrder), sellWallet)];
                    case 9:
                        sellSignature = _d.sent();
                        fill.makerSide = lib_1.OrderSide.Buy;
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executeHybridTrade.apply(exchange, lib_1.getHybridTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade))];
                    case 10:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for excessive maker fee', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade, error, e_15;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateHybridTrade(token, buyWallet, sellWallet, web3)];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, buySignature = _b.buySignature, sellOrder = _b.sellOrder, sellSignature = _b.sellSignature, fill = _b.fill, poolTrade = _b.poolTrade;
                        fill.netQuoteQuantity = '0.50000000';
                        _c.label = 4;
                    case 4:
                        _c.trys.push([4, 6, , 7]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executeHybridTrade.apply(exchange, lib_1.getHybridTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade, '0.01000000'))];
                    case 5:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_15 = _c.sent();
                        error = e_15;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/excessive maker fee/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for excessive taker fee', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade, error, e_16;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateHybridTrade(token, buyWallet, sellWallet, web3)];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, buySignature = _b.buySignature, sellOrder = _b.sellOrder, sellSignature = _b.sellSignature, fill = _b.fill, poolTrade = _b.poolTrade;
                        fill.netBaseQuantity = '0.50000000';
                        _c.label = 4;
                    case 4:
                        _c.trys.push([4, 6, , 7]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executeHybridTrade.apply(exchange, lib_1.getHybridTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade, '0.01000000'))];
                    case 5:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_16 = _c.sent();
                        error = e_16;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/excessive taker fee/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for non-zero pool gas fee', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade, error, e_17;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateHybridTrade(token, buyWallet, sellWallet, web3)];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, buySignature = _b.buySignature, sellOrder = _b.sellOrder, sellSignature = _b.sellSignature, fill = _b.fill, poolTrade = _b.poolTrade;
                        poolTrade.takerGasFeeQuantity = '0.01000000';
                        _c.label = 4;
                    case 4:
                        _c.trys.push([4, 6, , 7]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executeHybridTrade.apply(exchange, lib_1.getHybridTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade, '0.01000000'))];
                    case 5:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_17 = _c.sent();
                        error = e_17;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/non-zero pool gas fee/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when pool marginal buy price exceeded', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, poolTrade, buySignature, _c, sellOrder, fill, sellSignature, error, e_18;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _d.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _d.sent();
                        return [4 /*yield*/, deposit(exchange, token, buyWallet, '0.00000000', '10.00000000')];
                    case 3:
                        _d.sent();
                        return [4 /*yield*/, token.transfer(sellWallet, lib_1.decimalToAssetUnits('5000.00000000', 18))];
                    case 4:
                        _d.sent();
                        return [4 /*yield*/, deposit(exchange, token, sellWallet, '5000.00000000', '0.00000000')];
                    case 5:
                        _d.sent();
                        return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, '2222.22222224', '0.00081000')];
                    case 6:
                        _b = _d.sent(), buyOrder = _b.buyOrder, poolTrade = _b.poolTrade;
                        buyOrder.price = '0.00082000';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                    case 7:
                        buySignature = _d.sent();
                        poolTrade.netQuoteQuantity = '1.000000000';
                        poolTrade.grossQuoteQuantity = '1.000000000';
                        poolTrade.netBaseQuantity = '1111.11111112';
                        poolTrade.grossBaseQuantity = '1111.11111112';
                        return [4 /*yield*/, trade_test_1.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet, '1111.11111112', '0.00081000', ethMarketSymbol)];
                    case 8:
                        _c = _d.sent(), sellOrder = _c.sellOrder, fill = _c.fill;
                        sellOrder.quantity = '2222.22222224';
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(sellOrder), sellWallet)];
                    case 9:
                        sellSignature = _d.sent();
                        fill.makerSide = lib_1.OrderSide.Buy;
                        _d.label = 10;
                    case 10:
                        _d.trys.push([10, 12, , 13]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executeHybridTrade.apply(exchange, lib_1.getHybridTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade))];
                    case 11:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _d.sent();
                        return [3 /*break*/, 13];
                    case 12:
                        e_18 = _d.sent();
                        error = e_18;
                        return [3 /*break*/, 13];
                    case 13:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/marginal buy price exceeded/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when pool marginal sell price exceeded', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade, error, e_19;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, deposit(exchange, token, buyWallet, '0.00000000', '10.00000000')];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, token.transfer(sellWallet, lib_1.decimalToAssetUnits('5000.00000000', 18))];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, deposit(exchange, token, sellWallet, '5000.00000000', '0.00000000')];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, generateHybridTrade(token, buyWallet, sellWallet, web3)];
                    case 6:
                        _b = _c.sent(), buyOrder = _b.buyOrder, buySignature = _b.buySignature, sellOrder = _b.sellOrder, sellSignature = _b.sellSignature, fill = _b.fill, poolTrade = _b.poolTrade;
                        poolTrade.netQuoteQuantity = '1.00100000';
                        poolTrade.grossQuoteQuantity = '1.00100000';
                        _c.label = 7;
                    case 7:
                        _c.trys.push([7, 9, , 10]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executeHybridTrade.apply(exchange, lib_1.getHybridTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade))];
                    case 8:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        e_19 = _c.sent();
                        error = e_19;
                        return [3 /*break*/, 10];
                    case 10:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/marginal sell price exceeded/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for exited buy wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, error, e_20;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _b.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, exchange.exitWallet({ from: buyWallet })];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, generateAndExecuteHybridTrade(exchange, token, buyWallet, sellWallet, web3)];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_20 = _b.sent();
                        error = e_20;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/buy wallet exit finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for exited sell wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, error, e_21;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _b.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, exchange.exitWallet({ from: sellWallet })];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, generateAndExecuteHybridTrade(exchange, token, buyWallet, sellWallet, web3)];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_21 = _b.sent();
                        error = e_21;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/sell wallet exit finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for self-trade', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, error, e_22;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _b.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, generateAndExecuteHybridTrade(exchange, token, buyWallet, buyWallet, web3)];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_22 = _b.sent();
                        error = e_22;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/self-trading not allowed/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for mismatched trades', function () { return __awaiter(void 0, void 0, void 0, function () {
            var initialBaseReserve, initialQuoteReserve, _a, exchange, token, _b, buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade, error, e_23;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        initialBaseReserve = '10000.00000000';
                        initialQuoteReserve = '10.00000000';
                        return [4 /*yield*/, liquidity_pools_test_1.deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet)];
                    case 1:
                        _a = _c.sent(), exchange = _a.exchange, token = _a.token;
                        return [4 /*yield*/, exchange.setDispatcher(ownerWallet)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, generateHybridTrade(token, buyWallet, sellWallet, web3)];
                    case 3:
                        _b = _c.sent(), buyOrder = _b.buyOrder, buySignature = _b.buySignature, sellOrder = _b.sellOrder, sellSignature = _b.sellSignature, fill = _b.fill, poolTrade = _b.poolTrade;
                        poolTrade.quoteAssetAddress = token.address;
                        _c.label = 4;
                    case 4:
                        _c.trys.push([4, 6, , 7]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executeHybridTrade.apply(exchange, lib_1.getHybridTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade))];
                    case 5:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_23 = _c.sent();
                        error = e_23;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/mismatched trade assets/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
var deposit = function (exchange, token, wallet, tokenQuantity, bnbQuantity, decimals) {
    if (decimals === void 0) { decimals = 18; }
    return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(lib_1.decimalToAssetUnits(tokenQuantity, decimals) !== '0')) return [3 /*break*/, 3];
                    return [4 /*yield*/, token.approve(exchange.address, lib_1.decimalToAssetUnits(tokenQuantity, decimals), {
                            from: wallet
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, exchange.depositTokenByAddress(token.address, lib_1.decimalToAssetUnits(tokenQuantity, decimals), {
                            from: wallet
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    if (!(lib_1.decimalToAssetUnits(bnbQuantity, decimals) !== '0')) return [3 /*break*/, 5];
                    return [4 /*yield*/, exchange.depositEther({
                            value: lib_1.decimalToAssetUnits(bnbQuantity, decimals),
                            from: wallet
                        })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    });
};
var generateOrderAndPoolTrade = function (baseAssetAddress, quoteAssetAddress, wallet, quantity, price, market) {
    if (market === void 0) { market = ethMarketSymbol; }
    return __awaiter(void 0, void 0, void 0, function () {
        var quoteQuantity, buyOrder, poolTrade;
        return __generator(this, function (_a) {
            quoteQuantity = new bignumber_js_1["default"](quantity)
                .multipliedBy(new bignumber_js_1["default"](price))
                .toFixed(8, bignumber_js_1["default"].ROUND_DOWN);
            buyOrder = {
                signatureHashVersion: 2,
                nonce: uuid_1.v1(),
                wallet: wallet,
                market: market,
                type: lib_1.OrderType.Limit,
                side: lib_1.OrderSide.Buy,
                quantity: quantity,
                isQuantityInQuote: false,
                price: price
            };
            poolTrade = {
                baseAssetAddress: baseAssetAddress,
                quoteAssetAddress: quoteAssetAddress,
                grossBaseQuantity: quantity,
                grossQuoteQuantity: quoteQuantity,
                netBaseQuantity: quantity,
                netQuoteQuantity: quoteQuantity,
                // No fee
                takerPoolFeeQuantity: '0.00000000',
                takerProtocolFeeQuantity: '0.00000000',
                takerGasFeeQuantity: '0.00000000'
            };
            return [2 /*return*/, { buyOrder: buyOrder, poolTrade: poolTrade }];
        });
    });
};
var generateHybridTrade = function (token, buyWallet, sellWallet, web3, price, takerOrderBaseQuantity, poolTradeBaseQuantity, orderBookTradeBaseQuantity, poolTradeQuoteQuantity) {
    if (price === void 0) { price = '0.00121000'; }
    if (takerOrderBaseQuantity === void 0) { takerOrderBaseQuantity = '1818.18181818'; }
    if (poolTradeBaseQuantity === void 0) { poolTradeBaseQuantity = '909.09090909'; }
    if (orderBookTradeBaseQuantity === void 0) { orderBookTradeBaseQuantity = poolTradeBaseQuantity; }
    if (poolTradeQuoteQuantity === void 0) { poolTradeQuoteQuantity = '1.00000000'; }
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, buyOrder, poolTrade, buySignature, _b, sellOrder, fill, sellSignature;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, takerOrderBaseQuantity, price)];
                case 1:
                    _a = _c.sent(), buyOrder = _a.buyOrder, poolTrade = _a.poolTrade;
                    return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                case 2:
                    buySignature = _c.sent();
                    poolTrade.grossBaseQuantity = poolTradeBaseQuantity;
                    poolTrade.grossQuoteQuantity = poolTradeQuoteQuantity;
                    poolTrade.netBaseQuantity = poolTradeBaseQuantity;
                    poolTrade.netQuoteQuantity = poolTradeQuoteQuantity;
                    return [4 /*yield*/, trade_test_1.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet, orderBookTradeBaseQuantity, price, ethMarketSymbol)];
                case 3:
                    _b = _c.sent(), sellOrder = _b.sellOrder, fill = _b.fill;
                    return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(sellOrder), sellWallet)];
                case 4:
                    sellSignature = _c.sent();
                    return [2 /*return*/, { buyOrder: buyOrder, buySignature: buySignature, sellOrder: sellOrder, sellSignature: sellSignature, fill: fill, poolTrade: poolTrade }];
            }
        });
    });
};
var generateAndExecuteHybridTrade = function (exchange, token, buyWallet, sellWallet, web3, price, takerOrderBaseQuantity, poolTradeBaseQuantity, orderBookTradeBaseQuantity, poolTradeQuoteQuantity) {
    if (price === void 0) { price = '0.00121000'; }
    if (takerOrderBaseQuantity === void 0) { takerOrderBaseQuantity = '1818.18181818'; }
    if (poolTradeBaseQuantity === void 0) { poolTradeBaseQuantity = '909.09090909'; }
    if (orderBookTradeBaseQuantity === void 0) { orderBookTradeBaseQuantity = poolTradeBaseQuantity; }
    if (poolTradeQuoteQuantity === void 0) { poolTradeQuoteQuantity = '1.00000000'; }
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, buyOrder, poolTrade, buySignature, _b, sellOrder, fill, sellSignature;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, generateOrderAndPoolTrade(token.address, lib_1.ethAddress, buyWallet, takerOrderBaseQuantity, price)];
                case 1:
                    _a = _c.sent(), buyOrder = _a.buyOrder, poolTrade = _a.poolTrade;
                    return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet)];
                case 2:
                    buySignature = _c.sent();
                    poolTrade.grossBaseQuantity = poolTradeBaseQuantity;
                    poolTrade.grossQuoteQuantity = poolTradeQuoteQuantity;
                    poolTrade.netBaseQuantity = poolTradeBaseQuantity;
                    poolTrade.netQuoteQuantity = poolTradeQuoteQuantity;
                    return [4 /*yield*/, trade_test_1.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet, orderBookTradeBaseQuantity, price, ethMarketSymbol)];
                case 3:
                    _b = _c.sent(), sellOrder = _b.sellOrder, fill = _b.fill;
                    return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getOrderHash(sellOrder), sellWallet)];
                case 4:
                    sellSignature = _c.sent();
                    // https://github.com/microsoft/TypeScript/issues/28486
                    return [4 /*yield*/, exchange.executeHybridTrade.apply(exchange, lib_1.getHybridTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade))];
                case 5:
                    // https://github.com/microsoft/TypeScript/issues/28486
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
};
