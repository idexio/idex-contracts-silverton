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
contract('Governance', function (accounts) {
    var BalanceMigrationSourceMock = artifacts.require('BalanceMigrationSourceMock');
    var Exchange = artifacts.require('Exchange');
    var Governance = artifacts.require('Governance');
    var WETH = artifacts.require('WETH');
    var ethAddress = web3.utils.bytesToHex(__spreadArrays(Buffer.alloc(20)));
    it('should deploy', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Governance["new"](0)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    describe('setAdmin', function () {
        it('should work for valid address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Governance["new"](0)];
                    case 1:
                        governance = _a.sent();
                        return [4 /*yield*/, governance.setAdmin(accounts[1])];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for empty address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, error, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Governance["new"](0)];
                    case 1:
                        governance = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.setAdmin(ethAddress)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _a.sent();
                        error = e_1;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid wallet address/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
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
            var governance, error, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Governance["new"](0)];
                    case 1:
                        governance = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.setCustodian(ethAddress)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_2 = _a.sent();
                        error = e_2;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for non-contract address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, error, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Governance["new"](0)];
                    case 1:
                        governance = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.setCustodian(accounts[0])];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_3 = _a.sent();
                        error = e_3;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert after first call', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, custodian, governance, error, e_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        _a = _b.sent(), custodian = _a.custodian, governance = _a.governance;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.setCustodian(custodian.address)];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_4 = _b.sent();
                        error = e_4;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/custodian can only be set once/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when not called by admin', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, custodian, governance, error, e_5;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        _a = _b.sent(), custodian = _a.custodian, governance = _a.governance;
                        return [4 /*yield*/, governance.setAdmin(accounts[1])];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, governance.setCustodian(custodian.address, { from: accounts[0] })];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_5 = _b.sent();
                        error = e_5;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/caller must be admin/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('initiateExchangeUpgrade', function () {
        it('should work for valid contract address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, oldExchange, governance, newExchange, _b, _c, _d, events, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        _a = _g.sent(), oldExchange = _a.exchange, governance = _a.governance;
                        _c = (_b = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 2:
                        _d = [(_g.sent()).address];
                        return [4 /*yield*/, WETH["new"]()];
                    case 3: return [4 /*yield*/, _c.apply(_b, _d.concat([(_g.sent()).address]))];
                    case 4:
                        newExchange = _g.sent();
                        return [4 /*yield*/, governance.initiateExchangeUpgrade(newExchange.address)];
                    case 5:
                        _g.sent();
                        return [4 /*yield*/, governance.getPastEvents('ExchangeUpgradeInitiated', {
                                fromBlock: 0
                            })];
                    case 6:
                        events = _g.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        expect(events[0].returnValues.oldExchange).to.equal(oldExchange.address);
                        expect(events[0].returnValues.newExchange).to.equal(newExchange.address);
                        _f = (_e = expect(parseInt(events[0].returnValues.blockThreshold, 10)).to).equal;
                        return [4 /*yield*/, web3.eth.getBlockNumber()];
                    case 7:
                        _f.apply(_e, [_g.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid contract address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, error, e_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_a.sent()).governance;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.initiateExchangeUpgrade(ethAddress)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_6 = _a.sent();
                        error = e_6;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for non-contract address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, error, e_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Governance["new"](0)];
                    case 1:
                        governance = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.initiateExchangeUpgrade(accounts[0])];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_7 = _a.sent();
                        error = e_7;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for same Exchange address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, exchange, governance, error, e_8;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        _a = _b.sent(), exchange = _a.exchange, governance = _a.governance;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.initiateExchangeUpgrade(exchange.address)];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_8 = _b.sent();
                        error = e_8;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/must be different from current exchange/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when upgrade already in progress', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, newExchange, _a, _b, _c, error, e_9;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_d.sent()).governance;
                        _b = (_a = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 2:
                        _c = [(_d.sent()).address];
                        return [4 /*yield*/, WETH["new"]()];
                    case 3: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                    case 4:
                        newExchange = _d.sent();
                        return [4 /*yield*/, governance.initiateExchangeUpgrade(newExchange.address)];
                    case 5:
                        _d.sent();
                        _d.label = 6;
                    case 6:
                        _d.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, governance.initiateExchangeUpgrade(newExchange.address)];
                    case 7:
                        _d.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_9 = _d.sent();
                        error = e_9;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/exchange upgrade already in progress/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('cancelExchangeUpgrade', function () {
        it('should work when in progress', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, oldExchange, governance, newExchange, _b, _c, _d, events;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        _a = _e.sent(), oldExchange = _a.exchange, governance = _a.governance;
                        _c = (_b = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 2:
                        _d = [(_e.sent()).address];
                        return [4 /*yield*/, WETH["new"]()];
                    case 3: return [4 /*yield*/, _c.apply(_b, _d.concat([(_e.sent()).address]))];
                    case 4:
                        newExchange = _e.sent();
                        return [4 /*yield*/, governance.initiateExchangeUpgrade(newExchange.address)];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, governance.cancelExchangeUpgrade()];
                    case 6:
                        _e.sent();
                        return [4 /*yield*/, governance.getPastEvents('ExchangeUpgradeCanceled', {
                                fromBlock: 0
                            })];
                    case 7:
                        events = _e.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        expect(events[0].returnValues.oldExchange).to.equal(oldExchange.address);
                        expect(events[0].returnValues.newExchange).to.equal(newExchange.address);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when no upgrade in progress', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, error, e_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_a.sent()).governance;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.cancelExchangeUpgrade()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_10 = _a.sent();
                        error = e_10;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/no exchange upgrade in progress/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('finalizeExchangeUpgrade', function () {
        it('should work when in progress and addresses match', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, custodian, governance, newExchange, _b, _c, _d, events, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        _a = _f.sent(), custodian = _a.custodian, governance = _a.governance;
                        _c = (_b = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 2:
                        _d = [(_f.sent()).address];
                        return [4 /*yield*/, WETH["new"]()];
                    case 3: return [4 /*yield*/, _c.apply(_b, _d.concat([(_f.sent()).address]))];
                    case 4:
                        newExchange = _f.sent();
                        return [4 /*yield*/, governance.initiateExchangeUpgrade(newExchange.address)];
                    case 5:
                        _f.sent();
                        return [4 /*yield*/, governance.finalizeExchangeUpgrade(newExchange.address)];
                    case 6:
                        _f.sent();
                        return [4 /*yield*/, governance.getPastEvents('ExchangeUpgradeFinalized', {
                                fromBlock: 0
                            })];
                    case 7:
                        events = _f.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        _e = expect;
                        return [4 /*yield*/, custodian.loadExchange()];
                    case 8:
                        _e.apply(void 0, [_f.sent()]).to.equal(newExchange.address);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when no upgrade in progress', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, error, e_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_a.sent()).governance;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.finalizeExchangeUpgrade(ethAddress)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_11 = _a.sent();
                        error = e_11;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/no exchange upgrade in progress/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert on address mismatch', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, newExchange, _a, _b, _c, error, e_12;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_d.sent()).governance;
                        _b = (_a = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 2:
                        _c = [(_d.sent()).address];
                        return [4 /*yield*/, WETH["new"]()];
                    case 3: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                    case 4:
                        newExchange = _d.sent();
                        return [4 /*yield*/, governance.initiateExchangeUpgrade(newExchange.address)];
                    case 5:
                        _d.sent();
                        _d.label = 6;
                    case 6:
                        _d.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, governance.finalizeExchangeUpgrade(ethAddress)];
                    case 7:
                        _d.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_12 = _d.sent();
                        error = e_12;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/address mismatch/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when block threshold not reached', function () { return __awaiter(void 0, void 0, void 0, function () {
            var blockDelay, governance, newExchange, _a, _b, _c, error, e_13;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        blockDelay = 10;
                        return [4 /*yield*/, helpers_1.deployAndAssociateContracts(blockDelay)];
                    case 1:
                        governance = (_d.sent()).governance;
                        _b = (_a = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 2:
                        _c = [(_d.sent()).address];
                        return [4 /*yield*/, WETH["new"]()];
                    case 3: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.sent()).address]))];
                    case 4:
                        newExchange = _d.sent();
                        return [4 /*yield*/, governance.initiateExchangeUpgrade(newExchange.address)];
                    case 5:
                        _d.sent();
                        _d.label = 6;
                    case 6:
                        _d.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, governance.finalizeExchangeUpgrade(newExchange.address)];
                    case 7:
                        _d.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_13 = _d.sent();
                        error = e_13;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/block threshold not yet reached/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('initiateGovernanceUpgrade', function () {
        it('should work for valid contract address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var oldGovernance, newGovernance, events, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        oldGovernance = (_c.sent()).governance;
                        return [4 /*yield*/, Governance["new"](0)];
                    case 2:
                        newGovernance = _c.sent();
                        return [4 /*yield*/, oldGovernance.initiateGovernanceUpgrade(newGovernance.address)];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, oldGovernance.getPastEvents('GovernanceUpgradeInitiated', {
                                fromBlock: 0
                            })];
                    case 4:
                        events = _c.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        expect(events[0].returnValues.oldGovernance).to.equal(oldGovernance.address);
                        expect(events[0].returnValues.newGovernance).to.equal(newGovernance.address);
                        _b = (_a = expect(parseInt(events[0].returnValues.blockThreshold, 10)).to).equal;
                        return [4 /*yield*/, web3.eth.getBlockNumber()];
                    case 5:
                        _b.apply(_a, [_c.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid contract address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, error, e_14;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_a.sent()).governance;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.initiateGovernanceUpgrade(ethAddress)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_14 = _a.sent();
                        error = e_14;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for non-contract address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, error, e_15;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Governance["new"](0)];
                    case 1:
                        governance = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.initiateGovernanceUpgrade(accounts[0])];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_15 = _a.sent();
                        error = e_15;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid address/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for same Governance address', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, error, e_16;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_a.sent()).governance;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.initiateGovernanceUpgrade(governance.address)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_16 = _a.sent();
                        error = e_16;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/must be different from current governance/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when upgrade already in progress', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, newGovernance, error, e_17;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_a.sent()).governance;
                        return [4 /*yield*/, Governance["new"](0)];
                    case 2:
                        newGovernance = _a.sent();
                        return [4 /*yield*/, governance.initiateGovernanceUpgrade(newGovernance.address)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, governance.initiateGovernanceUpgrade(newGovernance.address)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_17 = _a.sent();
                        error = e_17;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/governance upgrade already in progress/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('cancelGovernanceUpgrade', function () {
        it('should work when in progress', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, newGovernance, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_a.sent()).governance;
                        return [4 /*yield*/, Governance["new"](0)];
                    case 2:
                        newGovernance = _a.sent();
                        return [4 /*yield*/, governance.initiateGovernanceUpgrade(newGovernance.address)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, governance.cancelGovernanceUpgrade()];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, governance.getPastEvents('GovernanceUpgradeCanceled', {
                                fromBlock: 0
                            })];
                    case 5:
                        events = _a.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        expect(events[0].returnValues.oldGovernance).to.equal(governance.address);
                        expect(events[0].returnValues.newGovernance).to.equal(newGovernance.address);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when no upgrade in progress', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, error, e_18;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_a.sent()).governance;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.cancelGovernanceUpgrade()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_18 = _a.sent();
                        error = e_18;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/no governance upgrade in progress/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('finalizeGovernanceUpgrade', function () {
        it('should work when in progress and addresses match', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, custodian, governance, newGovernance, events, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        _a = _c.sent(), custodian = _a.custodian, governance = _a.governance;
                        return [4 /*yield*/, Governance["new"](0)];
                    case 2:
                        newGovernance = _c.sent();
                        return [4 /*yield*/, governance.initiateGovernanceUpgrade(newGovernance.address)];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, governance.finalizeGovernanceUpgrade(newGovernance.address)];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, governance.getPastEvents('GovernanceUpgradeFinalized', {
                                fromBlock: 0
                            })];
                    case 5:
                        events = _c.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        _b = expect;
                        return [4 /*yield*/, custodian.loadGovernance()];
                    case 6:
                        _b.apply(void 0, [_c.sent()]).to.equal(newGovernance.address);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when no upgrade in progress', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, error, e_19;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_a.sent()).governance;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, governance.finalizeGovernanceUpgrade(ethAddress)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_19 = _a.sent();
                        error = e_19;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/no governance upgrade in progress/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert on address mismatch', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, newGovernance, error, e_20;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        governance = (_a.sent()).governance;
                        return [4 /*yield*/, Governance["new"](0)];
                    case 2:
                        newGovernance = _a.sent();
                        return [4 /*yield*/, governance.initiateGovernanceUpgrade(newGovernance.address)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, governance.finalizeGovernanceUpgrade(ethAddress)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_20 = _a.sent();
                        error = e_20;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/address mismatch/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when called before block threshold reached', function () { return __awaiter(void 0, void 0, void 0, function () {
            var governance, newGovernance, error, e_21;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts(10)];
                    case 1:
                        governance = (_a.sent()).governance;
                        return [4 /*yield*/, Governance["new"](10)];
                    case 2:
                        newGovernance = _a.sent();
                        return [4 /*yield*/, governance.initiateGovernanceUpgrade(newGovernance.address)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, governance.finalizeGovernanceUpgrade(newGovernance.address)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_21 = _a.sent();
                        error = e_21;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/block threshold not yet reached/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
