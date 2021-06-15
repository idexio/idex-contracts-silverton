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
var helpers_1 = require("./helpers");
var lib_1 = require("../../lib");
contract('Exchange (tokens)', function () {
    var AssetsMock = artifacts.require('AssetsMock');
    var Token = artifacts.require('TestToken');
    var tokenSymbol = 'TKN';
    describe('registerToken', function () {
        it('should work', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when token has too many decimals', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 100)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        error = e_1;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/token cannot have more than 32 decimals/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for ETH address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchange.registerToken(lib_1.ethAddress, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_2 = _a.sent();
                        error = e_2;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid token address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for blank symbol', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exchange.registerToken(token.address, '', 18)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_3 = _a.sent();
                        error = e_3;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid token symbol/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when already finalized', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 18)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_4 = _a.sent();
                        error = e_4;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/already finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('confirmTokenRegistration', function () {
        it('should work', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 18)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for unknown token address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, unknownToken, error, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, Token["new"]()];
                    case 3:
                        unknownToken = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exchange.confirmTokenRegistration(unknownToken.address, tokenSymbol, 18)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_5 = _a.sent();
                        error = e_5;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/unknown token/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when already finalized', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 18)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 18)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_6 = _a.sent();
                        error = e_6;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/already finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when symbols do not match', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol + "123", 18)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_7 = _a.sent();
                        error = e_7;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/symbols do not match/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when decimals do not match', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 17)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_8 = _a.sent();
                        error = e_8;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/decimals do not match/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('addTokenSymbol', function () {
        it('should work', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 18)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, exchange.addTokenSymbol(token.address, 'NEW')];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, exchange.getPastEvents('TokenSymbolAdded', {
                                fromBlock: 0
                            })];
                    case 6:
                        events = _a.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        expect(events[0].returnValues.assetAddress).to.equal(token.address);
                        expect(events[0].returnValues.assetSymbol).to.equal('NEW');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for unregistered token', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exchange.addTokenSymbol(token.address, 'NEW')];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_9 = _a.sent();
                        error = e_9;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/not finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for unconfirmed token', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, exchange.addTokenSymbol(token.address, 'NEW')];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_10 = _a.sent();
                        error = e_10;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/not finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for reserved ETH symbol', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 18)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exchange.addTokenSymbol(token.address, helpers_1.ethSymbol)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_11 = _a.sent();
                        error = e_11;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/BNB symbol reserved/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for ETH address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 18)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exchange.addTokenSymbol(lib_1.ethAddress, 'TKN')];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_12 = _a.sent();
                        error = e_12;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/not finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('loadAssetBySymbol', function () {
        it('should work for ETH', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, registeredAddress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.loadAssetBySymbol(helpers_1.ethSymbol, new Date().getTime())];
                    case 2:
                        registeredAddress = (_a.sent()).assetAddress;
                        expect(registeredAddress).to.equal(lib_1.ethAddress);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work for registered token', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, registeredAddress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.loadAssetBySymbol(tokenSymbol, new Date().getTime())];
                    case 3:
                        registeredAddress = (_a.sent()).assetAddress;
                        expect(registeredAddress).to.equal(token.address);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when no token registered for symbol', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exchange.loadAssetBySymbol(tokenSymbol + "123", new Date().getTime())];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_13 = _a.sent();
                        error = e_13;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/no confirmed asset found for symbol/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when no token registered for symbol prior to timestamp', function () { return __awaiter(void 0, void 0, void 0, function () {
            var timestampBeforeTokenRegistered, exchange, error, e_14;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        timestampBeforeTokenRegistered = new Date().getTime() - 10000000;
                        return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exchange.loadAssetBySymbol(tokenSymbol, timestampBeforeTokenRegistered)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_14 = _a.sent();
                        error = e_14;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/no confirmed asset found for symbol/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('assetUnitsToPips', function () { return __awaiter(void 0, void 0, void 0, function () {
        var assetsMock, assetUnitsToPips;
        return __generator(this, function (_a) {
            assetUnitsToPips = function (quantity, decimals) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, assetsMock.assetUnitsToPips(quantity, decimals)];
                    case 1: return [2 /*return*/, (_a.sent()).toString()];
                }
            }); }); };
            beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, AssetsMock["new"]()];
                        case 1:
                            assetsMock = _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should succeed', function () { return __awaiter(void 0, void 0, void 0, function () {
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _a = expect;
                            return [4 /*yield*/, assetUnitsToPips('10000000000', '18')];
                        case 1:
                            _a.apply(void 0, [_f.sent()]).to.equal('1');
                            _b = expect;
                            return [4 /*yield*/, assetUnitsToPips('10000000000000', '18')];
                        case 2:
                            _b.apply(void 0, [_f.sent()]).to.equal('1000');
                            _c = expect;
                            return [4 /*yield*/, assetUnitsToPips('1', '8')];
                        case 3:
                            _c.apply(void 0, [_f.sent()]).to.equal('1');
                            _d = expect;
                            return [4 /*yield*/, assetUnitsToPips('1', '2')];
                        case 4:
                            _d.apply(void 0, [_f.sent()]).to.equal('1000000');
                            _e = expect;
                            return [4 /*yield*/, assetUnitsToPips('1', '0')];
                        case 5:
                            _e.apply(void 0, [_f.sent()]).to.equal('100000000');
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should truncate fractions of a pip', function () { return __awaiter(void 0, void 0, void 0, function () {
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = expect;
                            return [4 /*yield*/, assetUnitsToPips('19', '9')];
                        case 1:
                            _a.apply(void 0, [_c.sent()]).to.equal('1');
                            _b = expect;
                            return [4 /*yield*/, assetUnitsToPips('1', '9')];
                        case 2:
                            _b.apply(void 0, [_c.sent()]).to.equal('0');
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert on uint64 overflow', function () { return __awaiter(void 0, void 0, void 0, function () {
                var error, e_15;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, assetUnitsToPips(new bignumber_js_1["default"](2).exponentiatedBy(128).toFixed(), '8')];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            e_15 = _a.sent();
                            error = e_15;
                            return [3 /*break*/, 3];
                        case 3:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/pip quantity overflows uint64/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert when token has too many decimals', function () { return __awaiter(void 0, void 0, void 0, function () {
                var error, e_16;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, assetUnitsToPips(new bignumber_js_1["default"](1).toFixed(), '100')];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            e_16 = _a.sent();
                            error = e_16;
                            return [3 /*break*/, 3];
                        case 3:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/asset cannot have more than 32 decimals/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    }); });
    describe('pipsToAssetUnits', function () { return __awaiter(void 0, void 0, void 0, function () {
        var assetsMock, pipsToAssetUnits;
        return __generator(this, function (_a) {
            pipsToAssetUnits = function (quantity, decimals) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, assetsMock.pipsToAssetUnits(quantity, decimals)];
                    case 1: return [2 /*return*/, (_a.sent()).toString()];
                }
            }); }); };
            beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, AssetsMock["new"]()];
                        case 1:
                            assetsMock = _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should succeed', function () { return __awaiter(void 0, void 0, void 0, function () {
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _a = expect;
                            return [4 /*yield*/, pipsToAssetUnits('1', '18')];
                        case 1:
                            _a.apply(void 0, [_f.sent()]).to.equal('10000000000');
                            _b = expect;
                            return [4 /*yield*/, pipsToAssetUnits('1000', '18')];
                        case 2:
                            _b.apply(void 0, [_f.sent()]).to.equal('10000000000000');
                            _c = expect;
                            return [4 /*yield*/, pipsToAssetUnits('1', '8')];
                        case 3:
                            _c.apply(void 0, [_f.sent()]).to.equal('1');
                            _d = expect;
                            return [4 /*yield*/, pipsToAssetUnits('1000000', '2')];
                        case 4:
                            _d.apply(void 0, [_f.sent()]).to.equal('1');
                            _e = expect;
                            return [4 /*yield*/, pipsToAssetUnits('100000000', '0')];
                        case 5:
                            _e.apply(void 0, [_f.sent()]).to.equal('1');
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert when token has too many decimals', function () { return __awaiter(void 0, void 0, void 0, function () {
                var error, e_17;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, pipsToAssetUnits(new bignumber_js_1["default"](1).toFixed(), '100')];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            e_17 = _a.sent();
                            error = e_17;
                            return [3 /*break*/, 3];
                        case 3:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/asset cannot have more than 32 decimals/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    }); });
});
