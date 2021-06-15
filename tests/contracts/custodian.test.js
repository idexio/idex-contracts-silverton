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
var lib_1 = require("../../lib");
contract('Custodian', function (accounts) {
    var BalanceMigrationSourceMock = artifacts.require('BalanceMigrationSourceMock');
    var Custodian = artifacts.require('Custodian');
    var Exchange = artifacts.require('Exchange');
    var Governance = artifacts.require('Governance');
    var GovernanceMock = artifacts.require('GovernanceMock');
    var ExchangeMock = artifacts.require('ExchangeMock');
    var Token = artifacts.require('TestToken');
    var WETH = artifacts.require('WETH');
    var exchange;
    var governance;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
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
                    exchange = _d.sent();
                    return [4 /*yield*/, Governance["new"](10)];
                case 4:
                    governance = _d.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    describe('deploy', function () {
        it('should work', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Custodian["new"](exchange.address, governance.address)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid exchange address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Custodian["new"](lib_1.ethAddress, governance.address)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        error = e_1;
                        return [3 /*break*/, 3];
                    case 3:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid exchange contract address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for non-contract exchange address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Custodian["new"](accounts[0], governance.address)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_2 = _a.sent();
                        error = e_2;
                        return [3 /*break*/, 3];
                    case 3:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid exchange contract address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid governance address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Custodian["new"](exchange.address, lib_1.ethAddress)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_3 = _a.sent();
                        error = e_3;
                        return [3 /*break*/, 3];
                    case 3:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid governance contract address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for non-contract governance address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Custodian["new"](exchange.address, accounts[0])];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_4 = _a.sent();
                        error = e_4;
                        return [3 /*break*/, 3];
                    case 3:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid governance contract address/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('receive', function () {
        var custodian;
        var exchangeMock;
        beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ExchangeMock["new"]()];
                    case 1:
                        exchangeMock = _a.sent();
                        return [4 /*yield*/, Custodian["new"](exchangeMock.address, governance.address)];
                    case 2:
                        custodian = _a.sent();
                        return [4 /*yield*/, exchangeMock.setCustodian(custodian.address)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work when sent from exchange address', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, web3.eth.sendTransaction({
                            from: accounts[0],
                            to: exchangeMock.address,
                            value: web3.utils.toWei('1', 'ether')
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when not sent from exchange address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, web3.eth.sendTransaction({
                                from: accounts[0],
                                to: custodian.address,
                                value: web3.utils.toWei('1', 'ether')
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_5 = _a.sent();
                        error = e_5;
                        return [3 /*break*/, 3];
                    case 3:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/caller must be exchange/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('setExchange', function () {
        var custodian;
        var governanceMock;
        beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, GovernanceMock["new"]()];
                    case 1:
                        governanceMock = _a.sent();
                        return [4 /*yield*/, Custodian["new"](exchange.address, governanceMock.address)];
                    case 2:
                        custodian = _a.sent();
                        governanceMock.setCustodian(custodian.address);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work when sent from governance address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var newExchange, _a, _b, _c, events;
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
                        newExchange = _d.sent();
                        return [4 /*yield*/, governanceMock.setExchange(newExchange.address)];
                    case 4:
                        _d.sent();
                        return [4 /*yield*/, custodian.getPastEvents('ExchangeChanged', {
                                fromBlock: 0
                            })];
                    case 5:
                        events = _d.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(2);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, e_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, governanceMock.setExchange(lib_1.ethAddress)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_6 = _a.sent();
                        error = e_6;
                        return [3 /*break*/, 3];
                    case 3:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid contract address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for non-contract address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, e_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, governanceMock.setExchange(accounts[0])];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_7 = _a.sent();
                        error = e_7;
                        return [3 /*break*/, 3];
                    case 3:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid contract address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when not sent from governance address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, e_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, custodian.setExchange(lib_1.ethAddress, {
                                from: accounts[1]
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_8 = _a.sent();
                        error = e_8;
                        return [3 /*break*/, 3];
                    case 3:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/caller must be governance/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('setGovernance', function () {
        var custodian;
        var governanceMock;
        beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, GovernanceMock["new"]()];
                    case 1:
                        governanceMock = _a.sent();
                        return [4 /*yield*/, Custodian["new"](exchange.address, governanceMock.address)];
                    case 2:
                        custodian = _a.sent();
                        governanceMock.setCustodian(custodian.address);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work when sent from governance address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var newGovernance, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Governance["new"](0)];
                    case 1:
                        newGovernance = _a.sent();
                        return [4 /*yield*/, governanceMock.setGovernance(newGovernance.address)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, custodian.getPastEvents('GovernanceChanged', {
                                fromBlock: 0
                            })];
                    case 3:
                        events = _a.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(2);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, e_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, governanceMock.setGovernance(lib_1.ethAddress)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_9 = _a.sent();
                        error = e_9;
                        return [3 /*break*/, 3];
                    case 3:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid contract address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for non-contract address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, e_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, governanceMock.setGovernance(accounts[0])];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_10 = _a.sent();
                        error = e_10;
                        return [3 /*break*/, 3];
                    case 3:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid contract address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when not sent from governance address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error, e_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, custodian.setGovernance(lib_1.ethAddress, {
                                from: accounts[1]
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_11 = _a.sent();
                        error = e_11;
                        return [3 /*break*/, 3];
                    case 3:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/caller must be governance/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('withdraw', function () {
        var custodian;
        var exchangeMock;
        beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ExchangeMock["new"]()];
                    case 1:
                        exchangeMock = _a.sent();
                        return [4 /*yield*/, Custodian["new"](exchangeMock.address, governance.address)];
                    case 2:
                        custodian = _a.sent();
                        return [4 /*yield*/, exchangeMock.setCustodian(custodian.address)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work when sent from exchange', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sourceWallet, destinationWallet, balanceBefore, balanceAfter;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sourceWallet = accounts[0], destinationWallet = accounts[1];
                        return [4 /*yield*/, web3.eth.sendTransaction({
                                from: sourceWallet,
                                to: exchangeMock.address,
                                value: web3.utils.toWei('1', 'ether')
                            })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, web3.eth.getBalance(destinationWallet)];
                    case 2:
                        balanceBefore = _a.sent();
                        return [4 /*yield*/, exchangeMock.withdraw(destinationWallet, lib_1.ethAddress, web3.utils.toWei('1', 'ether'))];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, web3.eth.getBalance(destinationWallet)];
                    case 4:
                        balanceAfter = _a.sent();
                        expect(new bignumber_js_1["default"](balanceAfter)
                            .minus(new bignumber_js_1["default"](balanceBefore))
                            .toString()).to.equal(web3.utils.toWei('1', 'ether'));
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert withdrawing ETH not deposited', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sourceWallet, destinationWallet, error, e_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sourceWallet = accounts[0], destinationWallet = accounts[1];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, exchangeMock.withdraw(destinationWallet, lib_1.ethAddress, web3.utils.toWei('1', 'ether'), { from: sourceWallet })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_12 = _a.sent();
                        error = e_12;
                        return [3 /*break*/, 4];
                    case 4:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/ETH transfer failed/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert withdrawing tokens not deposited', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sourceWallet, destinationWallet, token, error, e_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sourceWallet = accounts[0], destinationWallet = accounts[1];
                        return [4 /*yield*/, Token["new"]()];
                    case 1:
                        token = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchangeMock.withdraw(destinationWallet, token.address, web3.utils.toWei('1', 'ether'), { from: sourceWallet })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_13 = _a.sent();
                        error = e_13;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/transfer amount exceeds balance/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when not sent from exchange', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sourceWallet, destinationWallet, error, e_14;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sourceWallet = accounts[0], destinationWallet = accounts[1];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, custodian.withdraw(destinationWallet, lib_1.ethAddress, web3.utils.toWei('1', 'ether'), { from: sourceWallet })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_14 = _a.sent();
                        error = e_14;
                        return [3 /*break*/, 4];
                    case 4:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/caller must be exchange/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
