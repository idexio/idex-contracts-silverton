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
var helpers_1 = require("./helpers");
var lib_1 = require("../../lib");
var ethers_1 = require("ethers");
contract('Exchange (deposits)', function (accounts) {
    var BalanceMigrationSourceMock = artifacts.require('BalanceMigrationSourceMock');
    var Exchange = artifacts.require('Exchange');
    var NonCompliantToken = artifacts.require('NonCompliantToken');
    var SkimmingToken = artifacts.require('SkimmingTestToken');
    var Token = artifacts.require('TestToken');
    var WETH = artifacts.require('WETH');
    var tokenSymbol = 'TKN';
    it('should revert when receiving ETH directly', function () { return __awaiter(void 0, void 0, void 0, function () {
        var exchange, _a, _b, _c, error, e_1;
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
                            from: accounts[0],
                            to: exchange.address,
                            value: web3.utils.toWei('1', 'ether')
                        })];
                case 5:
                    _d.sent();
                    return [3 /*break*/, 7];
                case 6:
                    e_1 = _d.sent();
                    error = e_1;
                    return [3 /*break*/, 7];
                case 7:
                    expect(error).to.not.be.undefined;
                    expect(error.message).to.match(/revert/i);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should migrate balance on deposit', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, balanceMigrationSource, exchange, events, _b, wallet, assetAddress, assetSymbol, expectedQuantity, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                case 1:
                    _a = _g.sent(), balanceMigrationSource = _a.balanceMigrationSource, exchange = _a.exchange;
                    return [4 /*yield*/, balanceMigrationSource.setBalanceInPipsByAddress(accounts[0], lib_1.ethAddress, lib_1.assetUnitsToPips(helpers_1.minimumTokenQuantity, 18))];
                case 2:
                    _g.sent();
                    return [4 /*yield*/, exchange.depositEther({
                            value: helpers_1.minimumTokenQuantity,
                            from: accounts[0]
                        })];
                case 3:
                    _g.sent();
                    return [4 /*yield*/, exchange.getPastEvents('Deposited', {
                            fromBlock: 0
                        })];
                case 4:
                    events = _g.sent();
                    expect(events).to.be.an('array');
                    expect(events.length).to.equal(1);
                    _b = events[0].returnValues, wallet = _b.wallet, assetAddress = _b.assetAddress, assetSymbol = _b.assetSymbol;
                    expect(wallet).to.equal(accounts[0]);
                    expect(assetAddress).to.equal(lib_1.ethAddress);
                    expect(assetSymbol).to.equal(helpers_1.ethSymbol);
                    expectedQuantity = ethers_1.BigNumber.from(helpers_1.minimumTokenQuantity)
                        .mul(2)
                        .toString();
                    _c = expect;
                    return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(accounts[0], lib_1.ethAddress)];
                case 5:
                    _c.apply(void 0, [(_g.sent()).toString()]).to.equal(expectedQuantity);
                    _d = expect;
                    return [4 /*yield*/, exchange.loadBalanceInPipsByAddress(accounts[0], lib_1.ethAddress)];
                case 6:
                    _d.apply(void 0, [(_g.sent()).toString()]).to.equal(lib_1.assetUnitsToPips(expectedQuantity, 18));
                    _e = expect;
                    return [4 /*yield*/, exchange.loadBalanceInAssetUnitsBySymbol(accounts[0], helpers_1.ethSymbol)];
                case 7:
                    _e.apply(void 0, [(_g.sent()).toString()]).to.equal(expectedQuantity);
                    _f = expect;
                    return [4 /*yield*/, exchange.loadBalanceInPipsBySymbol(accounts[0], helpers_1.ethSymbol)];
                case 8:
                    _f.apply(void 0, [(_g.sent()).toString()]).to.equal(lib_1.assetUnitsToPips(expectedQuantity, 18));
                    return [2 /*return*/];
            }
        });
    }); });
    describe('setDepositIndex', function () {
        it('revert when called twice', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, _a, _b, _c, error, e_2;
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
                        return [4 /*yield*/, exchange.setDepositIndex(1)];
                    case 4:
                        _d.sent();
                        _d.label = 5;
                    case 5:
                        _d.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exchange.setDepositIndex(1)];
                    case 6:
                        _d.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_2 = _d.sent();
                        error = e_2;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/can only be set once/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('revert when called with zero', function () { return __awaiter(void 0, void 0, void 0, function () {
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
                        return [4 /*yield*/, exchange.setDepositIndex(0)];
                    case 5:
                        _d.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_3 = _d.sent();
                        error = e_3;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/must be nonzero/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    // TODO Verify balances
    describe('depositEther', function () {
        it('should work for minimum quantity', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, events, _a, wallet, assetAddress, assetSymbol, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_f.sent()).exchange;
                        return [4 /*yield*/, exchange.depositEther({
                                value: helpers_1.minimumTokenQuantity,
                                from: accounts[0]
                            })];
                    case 2:
                        _f.sent();
                        return [4 /*yield*/, exchange.getPastEvents('Deposited', {
                                fromBlock: 0
                            })];
                    case 3:
                        events = _f.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        _a = events[0].returnValues, wallet = _a.wallet, assetAddress = _a.assetAddress, assetSymbol = _a.assetSymbol;
                        expect(wallet).to.equal(accounts[0]);
                        expect(assetAddress).to.equal(lib_1.ethAddress);
                        expect(assetSymbol).to.equal(helpers_1.ethSymbol);
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(accounts[0], lib_1.ethAddress)];
                    case 4:
                        _b.apply(void 0, [(_f.sent()).toString()]).to.equal(helpers_1.minimumTokenQuantity);
                        _c = expect;
                        return [4 /*yield*/, exchange.loadBalanceInPipsByAddress(accounts[0], lib_1.ethAddress)];
                    case 5:
                        _c.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.assetUnitsToPips(helpers_1.minimumTokenQuantity, 18));
                        _d = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsBySymbol(accounts[0], helpers_1.ethSymbol)];
                    case 6:
                        _d.apply(void 0, [(_f.sent()).toString()]).to.equal(helpers_1.minimumTokenQuantity);
                        _e = expect;
                        return [4 /*yield*/, exchange.loadBalanceInPipsBySymbol(accounts[0], helpers_1.ethSymbol)];
                    case 7:
                        _e.apply(void 0, [(_f.sent()).toString()]).to.equal(lib_1.assetUnitsToPips(helpers_1.minimumTokenQuantity, 18));
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert below minimum quantity', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchange.depositEther({
                                value: (BigInt(helpers_1.minimumTokenQuantity) - BigInt(1)).toString(),
                                from: accounts[0]
                            })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_4 = _a.sent();
                        error = e_4;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/Quantity is too low/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when depositIndex is unset', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, _a, _b, _c, error, e_5;
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
                        return [4 /*yield*/, exchange.depositEther({
                                value: (BigInt(helpers_1.minimumTokenQuantity) - BigInt(1)).toString(),
                                from: accounts[0]
                            })];
                    case 5:
                        _d.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_5 = _d.sent();
                        error = e_5;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/deposits disabled/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('depositTokenBySymbol', function () {
        it('should work for minimum quantity', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, events, _a, wallet, assetAddress, assetSymbol;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_b.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _b.sent();
                        return [4 /*yield*/, token.approve(exchange.address, helpers_1.minimumTokenQuantity)];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, exchange.depositTokenBySymbol(tokenSymbol, helpers_1.minimumTokenQuantity)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, exchange.getPastEvents('Deposited', {
                                fromBlock: 0
                            })];
                    case 5:
                        events = _b.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        _a = events[0].returnValues, wallet = _a.wallet, assetAddress = _a.assetAddress, assetSymbol = _a.assetSymbol;
                        expect(wallet).to.equal(accounts[0]);
                        expect(assetAddress).to.equal(token.address);
                        expect(assetSymbol).to.equal(tokenSymbol);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for ETH', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 6, , 7]);
                        return [4 /*yield*/, token.approve(exchange.address, helpers_1.minimumTokenQuantity)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, exchange.depositTokenBySymbol('BNB', helpers_1.minimumTokenQuantity)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_6 = _a.sent();
                        error = e_6;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/use depositEther/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for exited wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, token.approve(exchange.address, helpers_1.minimumTokenQuantity)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.exitWallet()];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, exchange.depositTokenBySymbol(tokenSymbol, helpers_1.minimumTokenQuantity)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_7 = _a.sent();
                        error = e_7;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/wallet exited/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when token quantity above wallet balance', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, wallet, error, e_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        _a.sent();
                        wallet = accounts[1];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exchange.depositTokenBySymbol(tokenSymbol, helpers_1.minimumTokenQuantity, {
                                from: wallet
                            })];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_8 = _a.sent();
                        error = e_8;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/transfer amount exceeds balance/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for unknown token', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, wallet, error, e_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        wallet = accounts[1];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchange.depositTokenBySymbol(tokenSymbol, helpers_1.minimumTokenQuantity, {
                                from: wallet
                            })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_9 = _a.sent();
                        error = e_9;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/no confirmed asset found for symbol/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('depositTokenByAddress', function () {
        it('should work for minimum quantity', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, token.approve(exchange.address, helpers_1.minimumTokenQuantity)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.depositTokenByAddress(token.address, helpers_1.minimumTokenQuantity)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, exchange.getPastEvents('Deposited', {
                                fromBlock: 0
                            })];
                    case 5:
                        events = _a.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work for minimum quantity with non-compliant token', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, NonCompliantToken["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 18)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, token.approve(exchange.address, helpers_1.minimumTokenQuantity)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, exchange.depositTokenByAddress(token.address, helpers_1.minimumTokenQuantity)];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, exchange.getPastEvents('Deposited', {
                                fromBlock: 0
                            })];
                    case 7:
                        events = _a.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for ETH', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 6, , 7]);
                        return [4 /*yield*/, token.approve(exchange.address, helpers_1.minimumTokenQuantity)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, exchange.depositTokenByAddress(lib_1.ethAddress, helpers_1.minimumTokenQuantity)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_10 = _a.sent();
                        error = e_10;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/use depositEther/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for unknown token', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, wallet, error, e_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        wallet = accounts[1];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exchange.depositTokenByAddress(token.address, helpers_1.minimumTokenQuantity, {
                                from: wallet
                            })];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_11 = _a.sent();
                        error = e_11;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/no confirmed asset found for address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when token skims from transfer', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, SkimmingToken["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, token.setShouldSkim(true)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 18)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, token.approve(exchange.address, helpers_1.minimumTokenQuantity)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, exchange.depositTokenByAddress(token.address, helpers_1.minimumTokenQuantity)];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        e_12 = _a.sent();
                        error = e_12;
                        return [3 /*break*/, 10];
                    case 10:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/transferFrom success without expected balance change/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
