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
exports.generateOrdersAndFill = exports.executeOrderBookTrade = exports.depositTokenPair = exports.deposit = void 0;
var bignumber_js_1 = require("bignumber.js");
var uuid_1 = require("uuid");
var helpers_1 = require("./helpers");
var lib_1 = require("../../lib");
var tokenSymbol = 'TKN';
var marketSymbol = tokenSymbol + "-" + helpers_1.ethSymbol;
contract('Exchange (trades)', function (accounts) {
    var Token = artifacts.require('TestToken');
    describe('executeOrderBookTrade', function () {
        it('should work for matching limit orders', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, events, _b, loggedBuyWallet, loggedSellWallet, baseAssetSymbol, quoteAssetSymbol, buyOrderHash, sellOrderHash, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_g.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _g.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _g.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, depositAndTrade(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _a = _g.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        return [4 /*yield*/, exchange.getPastEvents('OrderBookTradeExecuted', {
                                fromBlock: 0
                            })];
                    case 5:
                        events = _g.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        _b = events[0].returnValues, loggedBuyWallet = _b.buyWallet, loggedSellWallet = _b.sellWallet, baseAssetSymbol = _b.baseAssetSymbol, quoteAssetSymbol = _b.quoteAssetSymbol;
                        buyOrderHash = lib_1.getOrderHash(buyOrder);
                        sellOrderHash = lib_1.getOrderHash(sellOrder);
                        expect(loggedBuyWallet).to.equal(buyWallet);
                        expect(loggedSellWallet).to.equal(sellWallet);
                        expect(baseAssetSymbol).to.equal(tokenSymbol);
                        expect(quoteAssetSymbol).to.equal(helpers_1.ethSymbol);
                        _c = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(buyWallet, token.address)];
                    case 6:
                        _c.apply(void 0, [(_g.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netBaseQuantity, 18));
                        _d = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(sellWallet, lib_1.ethAddress)];
                    case 7:
                        _d.apply(void 0, [(_g.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netQuoteQuantity, 18));
                        _e = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(buyOrderHash)];
                    case 8:
                        _e.apply(void 0, [(_g.sent()).toString()]).to.equal('0');
                        _f = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(sellOrderHash)];
                    case 9:
                        _f.apply(void 0, [(_g.sent()).toString()]).to.equal('0');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work near max pip value', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, baseToken, quoteToken, sellWallet, buyWallet, quantity, price, decimals, _a, buyOrder, sellOrder, fill, events, _b, loggedBuyWallet, loggedSellWallet, baseAssetSymbol, quoteAssetSymbol, buyOrderHash, sellOrderHash, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_g.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, 'BASE')];
                    case 2:
                        baseToken = _g.sent();
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, 'QUOTE')];
                    case 3:
                        quoteToken = _g.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 4:
                        _g.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, quoteToken.transfer(buyWallet, new bignumber_js_1["default"](10).exponentiatedBy(30).toFixed(0))];
                    case 5:
                        _g.sent();
                        quantity = '184467440737.09551615';
                        price = '0.10000000';
                        decimals = 18;
                        return [4 /*yield*/, exports.depositTokenPair(exchange, baseToken, quoteToken, buyWallet, sellWallet, decimals, quantity, price)];
                    case 6:
                        _g.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(baseToken.address, quoteToken.address, buyWallet, sellWallet, quantity, price, 'BASE-QUOTE')];
                    case 7:
                        _a = _g.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 8:
                        _g.sent();
                        return [4 /*yield*/, exchange.getPastEvents('OrderBookTradeExecuted', {
                                fromBlock: 0
                            })];
                    case 9:
                        events = _g.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        _b = events[0].returnValues, loggedBuyWallet = _b.buyWallet, loggedSellWallet = _b.sellWallet, baseAssetSymbol = _b.baseAssetSymbol, quoteAssetSymbol = _b.quoteAssetSymbol;
                        buyOrderHash = lib_1.getOrderHash(buyOrder);
                        sellOrderHash = lib_1.getOrderHash(sellOrder);
                        expect(loggedBuyWallet).to.equal(buyWallet);
                        expect(loggedSellWallet).to.equal(sellWallet);
                        expect(baseAssetSymbol).to.equal('BASE');
                        expect(quoteAssetSymbol).to.equal('QUOTE');
                        _c = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(buyWallet, baseToken.address)];
                    case 10:
                        _c.apply(void 0, [(_g.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netBaseQuantity, 18));
                        _d = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(sellWallet, quoteToken.address)];
                    case 11:
                        _d.apply(void 0, [(_g.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netQuoteQuantity, 18));
                        _e = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(buyOrderHash)];
                    case 12:
                        _e.apply(void 0, [(_g.sent()).toString()]).to.equal('0');
                        _f = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(sellOrderHash)];
                    case 13:
                        _f.apply(void 0, [(_g.sent()).toString()]).to.equal('0');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert above max pip value', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, baseToken, quoteToken, sellWallet, buyWallet, quantity, price, decimals, _a, buyOrder, sellOrder, fill, error, e_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, 'BASE')];
                    case 2:
                        baseToken = _b.sent();
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, 'QUOTE')];
                    case 3:
                        quoteToken = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 4:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, quoteToken.transfer(buyWallet, new bignumber_js_1["default"](10).exponentiatedBy(30).toFixed(0))];
                    case 5:
                        _b.sent();
                        quantity = '184467440737.09551615';
                        price = '1.00000001';
                        decimals = 18;
                        return [4 /*yield*/, exports.depositTokenPair(exchange, baseToken, quoteToken, buyWallet, sellWallet, decimals, quantity, '1.00000000')];
                    case 6:
                        _b.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(baseToken.address, quoteToken.address, buyWallet, sellWallet, quantity, price, 'BASE-QUOTE')];
                    case 7:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        // Adjust quantities to not overflow ethers encoding
                        fill.grossQuoteQuantity = new bignumber_js_1["default"](quantity)
                            .multipliedBy(new bignumber_js_1["default"]('1.00000000'))
                            .toFixed(8, bignumber_js_1["default"].ROUND_DOWN);
                        fill.netQuoteQuantity = fill.grossQuoteQuantity;
                        _b.label = 8;
                    case 8:
                        _b.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 9:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 10:
                        e_1 = _b.sent();
                        error = e_1;
                        return [3 /*break*/, 11];
                    case 11:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/pip quantity overflows uint64/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work for matching limit orders with 2 decimal base asset', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, events, buyOrderHash, sellOrderHash, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_f.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol, 2)];
                    case 2:
                        token = _f.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _f.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet, 2)];
                    case 4:
                        _f.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _f.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _f.sent();
                        return [4 /*yield*/, exchange.getPastEvents('OrderBookTradeExecuted', {
                                fromBlock: 0
                            })];
                    case 7:
                        events = _f.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        buyOrderHash = lib_1.getOrderHash(buyOrder);
                        sellOrderHash = lib_1.getOrderHash(sellOrder);
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(buyWallet, token.address)];
                    case 8:
                        _b.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netBaseQuantity, 2));
                        _c = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(sellWallet, lib_1.ethAddress)];
                    case 9:
                        _c.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netQuoteQuantity, 18));
                        _d = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(buyOrderHash)];
                    case 10:
                        _d.apply(void 0, [(_f.sent()).toString()]).to.equal('0');
                        _e = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(sellOrderHash)];
                    case 11:
                        _e.apply(void 0, [(_f.sent()).toString()]).to.equal('0');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work for matching limit orders without exact price match', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, quantity, price, quoteQuantity, events, _b, loggedBuyWallet, loggedSellWallet, baseAssetSymbol, quoteAssetSymbol, buyOrderHash, sellOrderHash, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_g.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _g.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _g.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _g.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _g.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        quantity = '0.02494589';
                        price = '0.01986173';
                        buyOrder.quantity = quantity;
                        buyOrder.price = price;
                        sellOrder.quantity = quantity;
                        sellOrder.price = price;
                        quoteQuantity = new bignumber_js_1["default"](quantity)
                            .multipliedBy(new bignumber_js_1["default"](price))
                            .toFixed(8, bignumber_js_1["default"].ROUND_DOWN);
                        fill.grossBaseQuantity = quantity;
                        fill.netBaseQuantity = quantity; // No fee
                        fill.grossQuoteQuantity = quoteQuantity;
                        fill.netQuoteQuantity = quoteQuantity; // No fee
                        fill.price = price;
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _g.sent();
                        return [4 /*yield*/, exchange.getPastEvents('OrderBookTradeExecuted', {
                                fromBlock: 0
                            })];
                    case 7:
                        events = _g.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        _b = events[0].returnValues, loggedBuyWallet = _b.buyWallet, loggedSellWallet = _b.sellWallet, baseAssetSymbol = _b.baseAssetSymbol, quoteAssetSymbol = _b.quoteAssetSymbol;
                        buyOrderHash = lib_1.getOrderHash(buyOrder);
                        sellOrderHash = lib_1.getOrderHash(sellOrder);
                        expect(loggedBuyWallet).to.equal(buyWallet);
                        expect(loggedSellWallet).to.equal(sellWallet);
                        expect(baseAssetSymbol).to.equal(tokenSymbol);
                        expect(quoteAssetSymbol).to.equal(helpers_1.ethSymbol);
                        _c = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(buyWallet, token.address)];
                    case 8:
                        _c.apply(void 0, [(_g.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netBaseQuantity, 18));
                        _d = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(sellWallet, lib_1.ethAddress)];
                    case 9:
                        _d.apply(void 0, [(_g.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netQuoteQuantity, 18));
                        _e = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(buyOrderHash)];
                    case 10:
                        _e.apply(void 0, [(_g.sent()).toString()]).to.equal('0');
                        _f = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(sellOrderHash)];
                    case 11:
                        _f.apply(void 0, [(_g.sent()).toString()]).to.equal('0');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work for matching stop limit orders', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, events, buyOrderHash, sellOrderHash, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_f.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _f.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _f.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _f.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _f.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        buyOrder.type = lib_1.OrderType.StopLossLimit;
                        sellOrder.type = lib_1.OrderType.StopLossLimit;
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _f.sent();
                        return [4 /*yield*/, exchange.getPastEvents('OrderBookTradeExecuted', {
                                fromBlock: 0
                            })];
                    case 7:
                        events = _f.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        buyOrderHash = lib_1.getOrderHash(buyOrder);
                        sellOrderHash = lib_1.getOrderHash(sellOrder);
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(buyWallet, token.address)];
                    case 8:
                        _b.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netBaseQuantity, 18));
                        _c = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(sellWallet, lib_1.ethAddress)];
                    case 9:
                        _c.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netQuoteQuantity, 18));
                        _d = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(buyOrderHash)];
                    case 10:
                        _d.apply(void 0, [(_f.sent()).toString()]).to.equal('0');
                        _e = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(sellOrderHash)];
                    case 11:
                        _e.apply(void 0, [(_f.sent()).toString()]).to.equal('0');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work for matching stop market orders', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, events, buyOrderHash, sellOrderHash, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_f.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _f.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _f.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _f.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _f.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        buyOrder.type = lib_1.OrderType.StopLoss;
                        sellOrder.type = lib_1.OrderType.TakeProfit;
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _f.sent();
                        return [4 /*yield*/, exchange.getPastEvents('OrderBookTradeExecuted', {
                                fromBlock: 0
                            })];
                    case 7:
                        events = _f.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        buyOrderHash = lib_1.getOrderHash(buyOrder);
                        sellOrderHash = lib_1.getOrderHash(sellOrder);
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(buyWallet, token.address)];
                    case 8:
                        _b.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netBaseQuantity, 18));
                        _c = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(sellWallet, lib_1.ethAddress)];
                    case 9:
                        _c.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netQuoteQuantity, 18));
                        _d = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(buyOrderHash)];
                    case 10:
                        _d.apply(void 0, [(_f.sent()).toString()]).to.equal('0');
                        _e = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(sellOrderHash)];
                    case 11:
                        _e.apply(void 0, [(_f.sent()).toString()]).to.equal('0');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work for matching maker limit and taker market order on quote terms', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, events, buyOrderHash, sellOrderHash, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_f.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _f.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _f.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _f.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _f.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        buyOrder.type = lib_1.OrderType.Market;
                        buyOrder.quantity = fill.grossQuoteQuantity;
                        buyOrder.isQuantityInQuote = true;
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _f.sent();
                        return [4 /*yield*/, exchange.getPastEvents('OrderBookTradeExecuted', {
                                fromBlock: 0
                            })];
                    case 7:
                        events = _f.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        buyOrderHash = lib_1.getOrderHash(buyOrder);
                        sellOrderHash = lib_1.getOrderHash(sellOrder);
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(buyWallet, token.address)];
                    case 8:
                        _b.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netBaseQuantity, 18));
                        _c = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(sellWallet, lib_1.ethAddress)];
                    case 9:
                        _c.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netQuoteQuantity, 18));
                        _d = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(buyOrderHash)];
                    case 10:
                        _d.apply(void 0, [(_f.sent()).toString()]).to.equal('0');
                        _e = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(sellOrderHash)];
                    case 11:
                        _e.apply(void 0, [(_f.sent()).toString()]).to.equal('0');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work for partial fill of matching limit orders', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, events, buyOrderHash, sellOrderHash, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_f.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _f.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _f.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _f.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _f.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.grossBaseQuantity = new bignumber_js_1["default"](fill.grossBaseQuantity)
                            .dividedBy(2)
                            .toString();
                        fill.netBaseQuantity = fill.grossBaseQuantity;
                        fill.grossQuoteQuantity = new bignumber_js_1["default"](fill.grossQuoteQuantity)
                            .dividedBy(2)
                            .toString();
                        fill.netQuoteQuantity = fill.grossQuoteQuantity;
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _f.sent();
                        return [4 /*yield*/, exchange.getPastEvents('OrderBookTradeExecuted', {
                                fromBlock: 0
                            })];
                    case 7:
                        events = _f.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        buyOrderHash = lib_1.getOrderHash(buyOrder);
                        sellOrderHash = lib_1.getOrderHash(sellOrder);
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(buyWallet, token.address)];
                    case 8:
                        _b.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netBaseQuantity, 18));
                        _c = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(sellWallet, lib_1.ethAddress)];
                    case 9:
                        _c.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netQuoteQuantity, 18));
                        _d = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(buyOrderHash)];
                    case 10:
                        _d.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToPips(fill.grossBaseQuantity));
                        _e = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(sellOrderHash)];
                    case 11:
                        _e.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToPips(fill.grossBaseQuantity));
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work for partial fill of matching maker limit and taker market order in quote terms', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, events, buyOrderHash, sellOrderHash, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_f.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _f.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _f.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _f.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _f.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        sellOrder.type = lib_1.OrderType.Market;
                        sellOrder.quantity = fill.grossQuoteQuantity;
                        sellOrder.isQuantityInQuote = true;
                        fill.grossBaseQuantity = new bignumber_js_1["default"](fill.grossBaseQuantity)
                            .dividedBy(2)
                            .toString();
                        fill.netBaseQuantity = fill.grossBaseQuantity;
                        fill.grossQuoteQuantity = new bignumber_js_1["default"](fill.grossQuoteQuantity)
                            .dividedBy(2)
                            .toString();
                        fill.netQuoteQuantity = fill.grossQuoteQuantity;
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _f.sent();
                        return [4 /*yield*/, exchange.getPastEvents('OrderBookTradeExecuted', {
                                fromBlock: 0
                            })];
                    case 7:
                        events = _f.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        buyOrderHash = lib_1.getOrderHash(buyOrder);
                        sellOrderHash = lib_1.getOrderHash(sellOrder);
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(buyWallet, token.address)];
                    case 8:
                        _b.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netBaseQuantity, 18));
                        _c = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(sellWallet, lib_1.ethAddress)];
                    case 9:
                        _c.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToAssetUnits(fill.netQuoteQuantity, 18));
                        _d = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(buyOrderHash)];
                    case 10:
                        _d.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToPips(fill.grossBaseQuantity));
                        _e = expect;
                        return [4 /*yield*/, exchange.loadPartiallyFilledOrderQuantityInPips(sellOrderHash)];
                    case 11:
                        _e.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.decimalToPips(fill.grossQuoteQuantity));
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for self-trade', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        sellOrder.wallet = buyOrder.wallet;
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_2 = _b.sent();
                        error = e_2;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/self-trading not allowed/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for limit order with quoteOrderQuantity', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        buyOrder.isQuantityInQuote = true;
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_3 = _b.sent();
                        error = e_3;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/order quote quantity only valid for market orders/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when fill base net and fee do not sum to gross', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.takerFeeQuantity = new bignumber_js_1["default"](fill.takerFeeQuantity)
                            .plus(new bignumber_js_1["default"]('0.00000001'))
                            .toFixed(8);
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_4 = _b.sent();
                        error = e_4;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/base fees unbalanced/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when fill quote net and fee do not sum to gross', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_5;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.makerFeeQuantity = new bignumber_js_1["default"](fill.makerFeeQuantity)
                            .plus(new bignumber_js_1["default"]('0.00000001'))
                            .toFixed(8);
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_5 = _b.sent();
                        error = e_5;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/quote fees unbalanced/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for limit order overfill', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.grossBaseQuantity = new bignumber_js_1["default"](fill.grossBaseQuantity)
                            .multipliedBy(0.9)
                            .toString();
                        fill.netBaseQuantity = fill.grossBaseQuantity;
                        fill.grossQuoteQuantity = new bignumber_js_1["default"](fill.grossQuoteQuantity)
                            .multipliedBy(0.9)
                            .toString();
                        fill.netQuoteQuantity = fill.grossQuoteQuantity;
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7:
                        _b.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        e_6 = _b.sent();
                        error = e_6;
                        return [3 /*break*/, 10];
                    case 10:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/order overfill/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for market order overfill on quote terms', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_7;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        buyOrder.type = lib_1.OrderType.Market;
                        buyOrder.quantity = fill.grossQuoteQuantity;
                        buyOrder.isQuantityInQuote = true;
                        fill.grossBaseQuantity = new bignumber_js_1["default"](fill.grossBaseQuantity)
                            .multipliedBy(0.9)
                            .toString();
                        fill.netBaseQuantity = fill.grossBaseQuantity;
                        fill.grossQuoteQuantity = new bignumber_js_1["default"](fill.grossQuoteQuantity)
                            .multipliedBy(0.9)
                            .toString();
                        fill.netQuoteQuantity = fill.grossQuoteQuantity;
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7:
                        _b.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        e_7 = _b.sent();
                        error = e_7;
                        return [3 /*break*/, 10];
                    case 10:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/order overfill/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when not called by dispatcher', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, error, e_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _a.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.exitWallet({ from: buyWallet })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, generateAndExecuteTrade(exchange, token, buyWallet, sellWallet)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_8 = _a.sent();
                        error = e_8;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/caller is not dispatcher/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for exited buy wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, error, e_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _a.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, exchange.exitWallet({ from: buyWallet })];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, generateAndExecuteTrade(exchange, token, buyWallet, sellWallet)];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_9 = _a.sent();
                        error = e_9;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/buy wallet exit finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for exited sell wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, error, e_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _a.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, exchange.exitWallet({ from: sellWallet })];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, generateAndExecuteTrade(exchange, token, buyWallet, sellWallet)];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_10 = _a.sent();
                        error = e_10;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/sell wallet exit finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalidated buy nonce', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, error, e_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _a.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid_1.v1({ msecs: new Date().getTime() + 100000 })), { from: buyWallet })];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, generateAndExecuteTrade(exchange, token, buyWallet, sellWallet)];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_11 = _a.sent();
                        error = e_11;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/buy order nonce timestamp too low/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalidated sell nonce', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, error, e_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _a.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid_1.v1({ msecs: new Date().getTime() + 100000 })), { from: sellWallet })];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, generateAndExecuteTrade(exchange, token, buyWallet, sellWallet)];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_12 = _a.sent();
                        error = e_12;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/sell order nonce timestamp too low/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for unconfirmed base asset', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_13;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 4:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_13 = _b.sent();
                        error = e_13;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/no confirmed asset found for symbol/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid signatureHashVersion', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_14;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 4:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        buyOrder.signatureHashVersion = 1;
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_14 = _b.sent();
                        error = e_14;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/signature hash version invalid/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid signature (wrong wallet)', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, _b, buySignature, sellSignature, error, e_15;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_c.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _c.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _c.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 4:
                        _a = _c.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        return [4 /*yield*/, Promise.all([
                                helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet),
                                // Sign with wrong wallet
                                helpers_1.getSignature(web3, lib_1.getOrderHash(sellOrder), buyWallet),
                            ])];
                    case 5:
                        _b = _c.sent(), buySignature = _b[0], sellSignature = _b[1];
                        _c.label = 6;
                    case 6:
                        _c.trys.push([6, 8, , 9]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executeOrderBookTrade.apply(exchange, lib_1.getTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill))];
                    case 7:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_15 = _c.sent();
                        error = e_15;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid wallet signature/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid signature (quote order quantity switched)', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, _b, buySignature, sellSignature, error, e_16;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_c.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _c.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _c.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 4:
                        _a = _c.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        buyOrder.type = lib_1.OrderType.Market;
                        return [4 /*yield*/, Promise.all([
                                helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet),
                                // Sign with wrong wallet
                                helpers_1.getSignature(web3, lib_1.getOrderHash(sellOrder), sellWallet),
                            ])];
                    case 5:
                        _b = _c.sent(), buySignature = _b[0], sellSignature = _b[1];
                        buyOrder.isQuantityInQuote = true;
                        _c.label = 6;
                    case 6:
                        _c.trys.push([6, 8, , 9]);
                        // https://github.com/microsoft/TypeScript/issues/28486
                        return [4 /*yield*/, exchange.executeOrderBookTrade.apply(exchange, lib_1.getTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill))];
                    case 7:
                        // https://github.com/microsoft/TypeScript/issues/28486
                        _c.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_16 = _c.sent();
                        error = e_16;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid wallet signature/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for excessive taker fee', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_17;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 4:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.takerFeeQuantity = fill.grossBaseQuantity;
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_17 = _b.sent();
                        error = e_17;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/excessive taker fee/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for excessive maker fee', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_18;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 4:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.makerFeeQuantity = fill.grossQuoteQuantity;
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_18 = _b.sent();
                        error = e_18;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/excessive maker fee/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for zero base quantity', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_19;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 4:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.grossBaseQuantity = '0';
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_19 = _b.sent();
                        error = e_19;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/base quantity must be greater than zero/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for zero quote quantity', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_20;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 4:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.grossQuoteQuantity = '0';
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_20 = _b.sent();
                        error = e_20;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/quote quantity must be greater than zero/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when buy limit price exceeded', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_21;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 4:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.grossBaseQuantity = new bignumber_js_1["default"](fill.grossBaseQuantity)
                            .minus(1)
                            .toString();
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_21 = _b.sent();
                        error = e_21;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/buy order limit price exceeded/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when sell limit price exceeded', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_22;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 4:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.grossBaseQuantity = new bignumber_js_1["default"](fill.grossBaseQuantity)
                            .plus(1)
                            .toString();
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_22 = _b.sent();
                        error = e_22;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/sell order limit price exceeded/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when base and quote assets are the same', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_23;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 4:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        buyOrder.market = helpers_1.ethSymbol + "-" + helpers_1.ethSymbol;
                        sellOrder.market = helpers_1.ethSymbol + "-" + helpers_1.ethSymbol;
                        fill.baseAssetAddress = lib_1.ethAddress;
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_23 = _b.sent();
                        error = e_23;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/assets must be different/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when maker fee asset not in trade pair', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, token2Symbol, token2, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_24;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        token2Symbol = tokenSymbol + "2";
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, token2Symbol)];
                    case 3:
                        token2 = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 4:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.makerFeeAssetAddress = token2.address;
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_24 = _b.sent();
                        error = e_24;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/fee assets mismatch trade pair/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when taker fee asset not in trade pair', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, token2Symbol, token2, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_25;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        token2Symbol = tokenSymbol + "2";
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, token2Symbol)];
                    case 3:
                        token2 = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 4:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.takerFeeAssetAddress = token2.address;
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_25 = _b.sent();
                        error = e_25;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/fee assets mismatch trade pair/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when maker and taker fee assets are the same', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_26;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 4:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        fill.makerFeeAssetAddress = fill.takerFeeAssetAddress;
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_26 = _b.sent();
                        error = e_26;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/fee assets mismatch trade pair/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert on double fill', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_27;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 5:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7:
                        _b.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        e_27 = _b.sent();
                        error = e_27;
                        return [3 /*break*/, 10];
                    case 10:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/order double filled/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
var deposit = function (exchange, token, buyWallet, sellWallet, decimals, quantity, price) {
    if (decimals === void 0) { decimals = 18; }
    if (quantity === void 0) { quantity = '10.00000000'; }
    if (price === void 0) { price = '0.10000000'; }
    return __awaiter(void 0, void 0, void 0, function () {
        var quoteQuantity;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    quoteQuantity = new bignumber_js_1["default"](quantity)
                        .multipliedBy(new bignumber_js_1["default"](price).shiftedBy(18 - decimals))
                        .toFixed(8, bignumber_js_1["default"].ROUND_DOWN);
                    return [4 /*yield*/, token.approve(exchange.address, lib_1.decimalToAssetUnits(quantity, decimals), {
                            from: sellWallet
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, exchange.depositTokenByAddress(token.address, lib_1.decimalToAssetUnits(quantity, decimals), {
                            from: sellWallet
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, exchange.depositEther({
                            value: lib_1.decimalToAssetUnits(quoteQuantity, decimals),
                            from: buyWallet
                        })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.deposit = deposit;
var depositTokenPair = function (exchange, baseToken, quoteToken, buyWallet, sellWallet, decimals, quantity, price) {
    if (decimals === void 0) { decimals = 18; }
    if (quantity === void 0) { quantity = '10.00000000'; }
    if (price === void 0) { price = '0.10000000'; }
    return __awaiter(void 0, void 0, void 0, function () {
        var quoteQuantity;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, baseToken.approve(exchange.address, lib_1.decimalToAssetUnits(quantity, decimals), {
                        from: sellWallet
                    })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, exchange.depositTokenByAddress(baseToken.address, lib_1.decimalToAssetUnits(quantity, decimals), {
                            from: sellWallet
                        })];
                case 2:
                    _a.sent();
                    quoteQuantity = new bignumber_js_1["default"](quantity)
                        .multipliedBy(new bignumber_js_1["default"](price).shiftedBy(18 - decimals))
                        .toFixed(8, bignumber_js_1["default"].ROUND_DOWN);
                    return [4 /*yield*/, quoteToken.approve(exchange.address, lib_1.decimalToAssetUnits(quoteQuantity, decimals), {
                            from: buyWallet
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, exchange.depositTokenByAddress(quoteToken.address, lib_1.decimalToAssetUnits(quoteQuantity, decimals), {
                            from: buyWallet
                        })];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.depositTokenPair = depositTokenPair;
var executeOrderBookTrade = function (exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, buySignature, sellSignature;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, Promise.all([
                    helpers_1.getSignature(web3, lib_1.getOrderHash(buyOrder), buyWallet),
                    helpers_1.getSignature(web3, lib_1.getOrderHash(sellOrder), sellWallet),
                ])];
            case 1:
                _a = _b.sent(), buySignature = _a[0], sellSignature = _a[1];
                // https://github.com/microsoft/TypeScript/issues/28486
                return [4 /*yield*/, exchange.executeOrderBookTrade.apply(exchange, lib_1.getTradeArguments(buyOrder, buySignature, sellOrder, sellSignature, fill))];
            case 2:
                // https://github.com/microsoft/TypeScript/issues/28486
                _b.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.executeOrderBookTrade = executeOrderBookTrade;
var generateOrdersAndFill = function (baseAssetAddress, quoteAssetAddress, buyWallet, sellWallet, quantity, price, // 1 ETH buys 10 TKN
market) {
    if (quantity === void 0) { quantity = '10.00000000'; }
    if (price === void 0) { price = '0.10000000'; }
    if (market === void 0) { market = marketSymbol; }
    return __awaiter(void 0, void 0, void 0, function () {
        var quoteQuantity, sellOrder, buyOrder, fill;
        return __generator(this, function (_a) {
            quoteQuantity = new bignumber_js_1["default"](quantity)
                .multipliedBy(new bignumber_js_1["default"](price))
                .toFixed(8, bignumber_js_1["default"].ROUND_DOWN);
            sellOrder = {
                signatureHashVersion: 2,
                nonce: uuid_1.v1(),
                wallet: sellWallet,
                market: market,
                type: lib_1.OrderType.Limit,
                side: lib_1.OrderSide.Sell,
                quantity: quantity,
                isQuantityInQuote: false,
                price: price
            };
            buyOrder = {
                signatureHashVersion: 2,
                nonce: uuid_1.v1(),
                wallet: buyWallet,
                market: market,
                type: lib_1.OrderType.Limit,
                side: lib_1.OrderSide.Buy,
                quantity: quantity,
                isQuantityInQuote: false,
                price: price
            };
            fill = {
                baseAssetAddress: baseAssetAddress,
                quoteAssetAddress: quoteAssetAddress,
                grossBaseQuantity: quantity,
                grossQuoteQuantity: quoteQuantity,
                netBaseQuantity: quantity,
                netQuoteQuantity: quoteQuantity,
                makerFeeAssetAddress: quoteAssetAddress,
                takerFeeAssetAddress: baseAssetAddress,
                makerFeeQuantity: '0',
                takerFeeQuantity: '0',
                price: price,
                makerSide: lib_1.OrderSide.Sell
            };
            return [2 /*return*/, { buyOrder: buyOrder, sellOrder: sellOrder, fill: fill }];
        });
    });
};
exports.generateOrdersAndFill = generateOrdersAndFill;
var depositAndTrade = function (exchange, token, buyWallet, sellWallet) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, exports.deposit(exchange, token, buyWallet, sellWallet)];
            case 1:
                _a.sent();
                return [2 /*return*/, generateAndExecuteTrade(exchange, token, buyWallet, sellWallet)];
        }
    });
}); };
var generateAndExecuteTrade = function (exchange, token, buyWallet, sellWallet) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, buyOrder, sellOrder, fill;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, exports.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
            case 1:
                _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                return [4 /*yield*/, exports.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
            case 2:
                _b.sent();
                return [2 /*return*/, { buyOrder: buyOrder, sellOrder: sellOrder, fill: fill }];
        }
    });
}); };
