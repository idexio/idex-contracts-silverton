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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var helpers_1 = require("./helpers");
contract('Exchange (tunable parameters)', function (accounts) {
    var BalanceMigrationSourceMock = artifacts.require('BalanceMigrationSourceMock');
    var CleanupExchange = artifacts.require('CleanupExchange');
    var Exchange = artifacts.require('Exchange');
    var WETH = artifacts.require('WETH');
    var ethAddress = web3.utils.bytesToHex(__spreadArrays(Buffer.alloc(20)));
    describe('constructor', function () {
        it('should work', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _b = (_a = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 1:
                        _c = [(_d.sent()).address];
                        return [4 /*yield*/, WETH["new"]()];
                    case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                    case 3:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid balance migration source', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, _a, _b, _c, e_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 3, , 4]);
                        _b = (_a = Exchange)["new"];
                        _c = [ethAddress];
                        return [4 /*yield*/, WETH["new"]()];
                    case 1: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                    case 2:
                        _d.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _d.sent();
                        error = e_1;
                        return [3 /*break*/, 4];
                    case 4:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid migration source/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid WETH address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, _a, _b, e_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        _b = (_a = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 1: return [4 /*yield*/, _b.apply(_a, [(_c.sent()).address, ethAddress])];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _c.sent();
                        error = e_2;
                        return [3 /*break*/, 4];
                    case 4:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid WETH address/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    it('should revert when receiving ETH directly', function () { return __awaiter(void 0, void 0, void 0, function () {
        var exchange, _a, _b, _c, error, e_3;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _b = (_a = Exchange)["new"];
                    return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                case 1:
                    _c = [(_d.sent()).address];
                    return [4 /*yield*/, WETH["new"]()];
                case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                case 3:
                    exchange = _d.sent();
                    _d.label = 4;
                case 4:
                    _d.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, web3.eth.sendTransaction({
                            to: exchange.address,
                            from: accounts[0],
                            value: web3.utils.toWei('1', 'ether')
                        })];
                case 5:
                    _d.sent();
                    return [3 /*break*/, 7];
                case 6:
                    e_3 = _d.sent();
                    error = e_3;
                    return [3 /*break*/, 7];
                case 7:
                    expect(error).to.not.be.undefined;
                    expect(error.message).to.match(/revert/i);
                    return [2 /*return*/];
            }
        });
    }); });
    describe('loadBalanceInAssetUnitsByAddress', function () {
        it('should revert for invalid wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(ethAddress, ethAddress)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_4 = _a.sent();
                        error = e_4;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid wallet address/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('loadBalanceInPipsByAddress', function () {
        it('should revert for invalid wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchange.loadBalanceInPipsByAddress(ethAddress, ethAddress)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_5 = _a.sent();
                        error = e_5;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid wallet address/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('loadBalanceInPipsBySymbol', function () {
        it('should revert for invalid wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchange.loadBalanceInPipsBySymbol(ethAddress, helpers_1.ethSymbol)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_6 = _a.sent();
                        error = e_6;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid wallet address/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('loadBalanceInAssetUnitsBySymbol', function () {
        it('should revert for invalid wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsBySymbol(ethAddress, helpers_1.ethSymbol)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_7 = _a.sent();
                        error = e_7;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid wallet address/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('loadPairFactoryContractAddress', function () {
        it('should work', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, address, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, WETH["new"]()];
                    case 2:
                        address = (_a.sent()).address;
                        return [4 /*yield*/, exchange.setPairFactoryAddress(address)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.loadPairFactoryContractAddress()];
                    case 4:
                        result = _a.sent();
                        expect(result).to.equal(address);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('loadWETHAddress', function () {
        it('should work', function () { return __awaiter(void 0, void 0, void 0, function () {
            var address, exchange, _a, _b, result;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, WETH["new"]()];
                    case 1:
                        address = (_c.sent()).address;
                        _b = (_a = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 2: return [4 /*yield*/, _b.apply(_a, [(_c.sent()).address, address])];
                    case 3:
                        exchange = _c.sent();
                        return [4 /*yield*/, exchange.loadWETHAddress()];
                    case 4:
                        result = _c.sent();
                        expect(result).to.equal(address);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('cleanupWalletBalance', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            it('should work for valid address', function () { return __awaiter(void 0, void 0, void 0, function () {
                var _a, exchange, governance, cleanupExchange;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                        case 1:
                            _a = _b.sent(), exchange = _a.exchange, governance = _a.governance;
                            return [4 /*yield*/, CleanupExchange["new"](exchange.address)];
                        case 2:
                            cleanupExchange = _b.sent();
                            return [4 /*yield*/, governance.initiateExchangeUpgrade(cleanupExchange.address)];
                        case 3:
                            _b.sent();
                            return [4 /*yield*/, governance.finalizeExchangeUpgrade(cleanupExchange.address)];
                        case 4:
                            _b.sent();
                            return [4 /*yield*/, cleanupExchange.cleanup(accounts[0], ethAddress)];
                        case 5:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert if not called by current Exchange', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, error, e_8;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                        case 1:
                            exchange = (_a.sent()).exchange;
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, exchange.cleanupWalletBalance(ethAddress, ethAddress)];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            e_8 = _a.sent();
                            error = e_8;
                            return [3 /*break*/, 5];
                        case 5:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/caller is not exchange/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    }); });
    describe('setAdmin', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            it('should work for valid address', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _b = (_a = Exchange)["new"];
                            return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                        case 1:
                            _c = [(_d.sent()).address];
                            return [4 /*yield*/, WETH["new"]()];
                        case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                        case 3:
                            exchange = _d.sent();
                            return [4 /*yield*/, exchange.setAdmin(accounts[1])];
                        case 4:
                            _d.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert for empty address', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, _a, _b, _c, error, e_9;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _b = (_a = Exchange)["new"];
                            return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                        case 1:
                            _c = [(_d.sent()).address];
                            return [4 /*yield*/, WETH["new"]()];
                        case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                        case 3:
                            exchange = _d.sent();
                            _d.label = 4;
                        case 4:
                            _d.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, exchange.setAdmin(ethAddress)];
                        case 5:
                            _d.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            e_9 = _d.sent();
                            error = e_9;
                            return [3 /*break*/, 7];
                        case 7:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/invalid wallet address/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert for setting same address as current', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, error, e_10;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                        case 1:
                            exchange = (_a.sent()).exchange;
                            return [4 /*yield*/, exchange.setAdmin(accounts[1])];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, exchange.setAdmin(accounts[1])];
                        case 4:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            e_10 = _a.sent();
                            error = e_10;
                            return [3 /*break*/, 6];
                        case 6:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/must be different/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert when not called by owner', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, _a, _b, _c, error, e_11;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _b = (_a = Exchange)["new"];
                            return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                        case 1:
                            _c = [(_d.sent()).address];
                            return [4 /*yield*/, WETH["new"]()];
                        case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                        case 3:
                            exchange = _d.sent();
                            _d.label = 4;
                        case 4:
                            _d.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, exchange.setAdmin(accounts[1], { from: accounts[1] })];
                        case 5:
                            _d.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            e_11 = _d.sent();
                            error = e_11;
                            return [3 /*break*/, 7];
                        case 7:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/caller must be owner/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    }); });
    describe('setPairFactoryAddress', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            it('should work for valid address', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _b = (_a = Exchange)["new"];
                            return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                        case 1:
                            _c = [(_f.sent()).address];
                            return [4 /*yield*/, WETH["new"]()];
                        case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_f.sent()).address]))];
                        case 3:
                            exchange = _f.sent();
                            _e = (_d = exchange).setPairFactoryAddress;
                            return [4 /*yield*/, WETH["new"]()];
                        case 4: return [4 /*yield*/, _e.apply(_d, [(_f.sent()).address])];
                        case 5:
                            _f.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert for empty address', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, _a, _b, _c, error, e_12;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _b = (_a = Exchange)["new"];
                            return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                        case 1:
                            _c = [(_d.sent()).address];
                            return [4 /*yield*/, WETH["new"]()];
                        case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                        case 3:
                            exchange = _d.sent();
                            _d.label = 4;
                        case 4:
                            _d.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, exchange.setPairFactoryAddress(ethAddress)];
                        case 5:
                            _d.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            e_12 = _d.sent();
                            error = e_12;
                            return [3 /*break*/, 7];
                        case 7:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/invalid address/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert when called more than once', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, _a, _b, error, _c, _d, e_13;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                        case 1:
                            exchange = (_e.sent()).exchange;
                            _b = (_a = exchange).setPairFactoryAddress;
                            return [4 /*yield*/, WETH["new"]()];
                        case 2: return [4 /*yield*/, _b.apply(_a, [(_e.sent()).address])];
                        case 3:
                            _e.sent();
                            _e.label = 4;
                        case 4:
                            _e.trys.push([4, 7, , 8]);
                            _d = (_c = exchange).setPairFactoryAddress;
                            return [4 /*yield*/, WETH["new"]()];
                        case 5: return [4 /*yield*/, _d.apply(_c, [(_e.sent()).address])];
                        case 6:
                            _e.sent();
                            return [3 /*break*/, 8];
                        case 7:
                            e_13 = _e.sent();
                            error = e_13;
                            return [3 /*break*/, 8];
                        case 8:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/factory can only be set once/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert when not called by admin', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, _a, _b, _c, error, e_14;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _b = (_a = Exchange)["new"];
                            return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                        case 1:
                            _c = [(_d.sent()).address];
                            return [4 /*yield*/, WETH["new"]()];
                        case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                        case 3:
                            exchange = _d.sent();
                            _d.label = 4;
                        case 4:
                            _d.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, exchange.setPairFactoryAddress(accounts[1], {
                                    from: accounts[1]
                                })];
                        case 5:
                            _d.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            e_14 = _d.sent();
                            error = e_14;
                            return [3 /*break*/, 7];
                        case 7:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/caller must be admin/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    }); });
    describe('removeAdmin', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            it('should work', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                        case 1:
                            exchange = (_a.sent()).exchange;
                            return [4 /*yield*/, exchange.removeAdmin()];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    }); });
    describe('setCustodian', function () {
        it('should work for valid address', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for empty address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, _a, _b, _c, error, e_15;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _b = (_a = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 1:
                        _c = [(_d.sent()).address];
                        return [4 /*yield*/, WETH["new"]()];
                    case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                    case 3:
                        exchange = _d.sent();
                        _d.label = 4;
                    case 4:
                        _d.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, exchange.setCustodian(ethAddress)];
                    case 5:
                        _d.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_15 = _d.sent();
                        error = e_15;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert after first call', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, custodian, exchange, error, e_16;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        _a = _b.sent(), custodian = _a.custodian, exchange = _a.exchange;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchange.setCustodian(custodian.address)];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_16 = _b.sent();
                        error = e_16;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/custodian can only be set once/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('setChainPropagationPeriod', function () {
        it('should work for value in bounds', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.setChainPropagationPeriod('10')];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, exchange.getPastEvents('ChainPropagationPeriodChanged', {
                                fromBlock: 0
                            })];
                    case 3:
                        events = _a.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for value out of bounds', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_17;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchange.setChainPropagationPeriod('1000000000000000000000000')];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_17 = _a.sent();
                        error = e_17;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/greater than max/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('setDispatcher', function () {
        it('should work for valid address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[1])];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, exchange.getPastEvents('DispatcherChanged', {
                                fromBlock: 0
                            })];
                    case 3:
                        events = _a.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for empty address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, _a, _b, _c, error, e_18;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _b = (_a = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 1:
                        _c = [(_d.sent()).address];
                        return [4 /*yield*/, WETH["new"]()];
                    case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                    case 3:
                        exchange = _d.sent();
                        _d.label = 4;
                    case 4:
                        _d.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, exchange.setDispatcher(ethAddress)];
                    case 5:
                        _d.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_18 = _d.sent();
                        error = e_18;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid wallet address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for setting same address as current', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_19;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[1])];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exchange.setDispatcher(accounts[1])];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_19 = _a.sent();
                        error = e_19;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/must be different/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('removeDispatcher', function () {
        it('should set wallet to zero', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[1])];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, exchange.removeDispatcher()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.getPastEvents('DispatcherChanged', {
                                fromBlock: 0
                            })];
                    case 4:
                        events = _a.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(2);
                        expect(events[1].returnValues.newValue).to.equal(ethAddress);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('setFeeWallet', function () {
        it('should work for valid address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, events, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, exchange.setFeeWallet(accounts[1])];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, exchange.getPastEvents('FeeWalletChanged', {
                                fromBlock: 0
                            })];
                    case 3:
                        events = _b.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        _a = expect;
                        return [4 /*yield*/, exchange.loadFeeWallet()];
                    case 4:
                        _a.apply(void 0, [_b.sent()]).to.equal(accounts[1]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for empty address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, _a, _b, _c, error, e_20;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _b = (_a = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 1:
                        _c = [(_d.sent()).address];
                        return [4 /*yield*/, WETH["new"]()];
                    case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                    case 3:
                        exchange = _d.sent();
                        _d.label = 4;
                    case 4:
                        _d.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, exchange.setFeeWallet(ethAddress)];
                    case 5:
                        _d.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_20 = _d.sent();
                        error = e_20;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid wallet address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for setting same address as current', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_21;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.setFeeWallet(accounts[1])];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exchange.setFeeWallet(accounts[1])];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_21 = _a.sent();
                        error = e_21;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/must be different/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
