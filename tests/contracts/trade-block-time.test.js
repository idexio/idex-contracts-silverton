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
var uuid_1 = require("uuid");
var lib_1 = require("../../lib");
var helpers_1 = require("./helpers");
var trade_test_1 = require("./trade.test");
var tokenSymbol = 'TKN';
// These tests advance the block timestamp to test the nonce-timestamp filtering for the asset
// registry. Changing the block timestamp causes side effects for other tests that don't specifically
// handle it, so isolate these tests here
contract('Exchange (trades)', function (accounts) {
    describe('executeOrderBookTrade', function () {
        it('should revert when buy order base asset is mismatched with trade', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, oldTimestampMs, token, newTimestampMs, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, web3.eth.getBlock('latest')];
                    case 3:
                        oldTimestampMs = (_b.sent()).timestamp * 1000;
                        return [4 /*yield*/, helpers_1.increaseBlockTimestamp()];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 5:
                        token = _b.sent();
                        return [4 /*yield*/, web3.eth.getBlock('latest')];
                    case 6:
                        newTimestampMs = (_b.sent()).timestamp * 1000;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 7:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, trade_test_1.deposit(exchange, token, buyWallet, sellWallet)];
                    case 8:
                        _b.sent();
                        return [4 /*yield*/, trade_test_1.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 9:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        buyOrder.nonce = uuid_1.v1({ msecs: oldTimestampMs });
                        sellOrder.nonce = uuid_1.v1({ msecs: newTimestampMs });
                        _b.label = 10;
                    case 10:
                        _b.trys.push([10, 12, , 13]);
                        return [4 /*yield*/, trade_test_1.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 11:
                        _b.sent();
                        return [3 /*break*/, 13];
                    case 12:
                        e_1 = _b.sent();
                        error = e_1;
                        return [3 /*break*/, 13];
                    case 13:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/order symbol address mismatch/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when sell order base asset is mismatched with trade', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, oldTimestampMs, token, newTimestampMs, sellWallet, buyWallet, _a, buyOrder, sellOrder, fill, error, e_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, web3.eth.getBlock('latest')];
                    case 3:
                        oldTimestampMs = (_b.sent()).timestamp * 1000;
                        return [4 /*yield*/, helpers_1.increaseBlockTimestamp()];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 5:
                        token = _b.sent();
                        return [4 /*yield*/, web3.eth.getBlock('latest')];
                    case 6:
                        newTimestampMs = (_b.sent()).timestamp * 1000;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 7:
                        _b.sent();
                        sellWallet = accounts[0], buyWallet = accounts[1];
                        return [4 /*yield*/, trade_test_1.deposit(exchange, token, buyWallet, sellWallet)];
                    case 8:
                        _b.sent();
                        return [4 /*yield*/, trade_test_1.generateOrdersAndFill(token.address, lib_1.ethAddress, buyWallet, sellWallet)];
                    case 9:
                        _a = _b.sent(), buyOrder = _a.buyOrder, sellOrder = _a.sellOrder, fill = _a.fill;
                        buyOrder.nonce = uuid_1.v1({ msecs: newTimestampMs });
                        sellOrder.nonce = uuid_1.v1({ msecs: oldTimestampMs });
                        _b.label = 10;
                    case 10:
                        _b.trys.push([10, 12, , 13]);
                        return [4 /*yield*/, trade_test_1.executeOrderBookTrade(exchange, buyWallet, sellWallet, buyOrder, sellOrder, fill)];
                    case 11:
                        _b.sent();
                        return [3 /*break*/, 13];
                    case 12:
                        e_2 = _b.sent();
                        error = e_2;
                        return [3 /*break*/, 13];
                    case 13:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/order symbol address mismatch/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
