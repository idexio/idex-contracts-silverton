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
var lib_1 = require("../../lib");
var helpers_1 = require("./helpers");
// TODO Non-zero gas fees
contract('Exchange (withdrawals)', function (accounts) {
    var BalanceMigrationSourceMock = artifacts.require('BalanceMigrationSourceMock');
    var Custodian = artifacts.require('Custodian');
    var Exchange = artifacts.require('Exchange');
    var Governance = artifacts.require('Governance');
    var NonCompliantToken = artifacts.require('NonCompliantToken');
    var SkimmingToken = artifacts.require('SkimmingTestToken');
    var Token = artifacts.require('TestToken');
    var WETH = artifacts.require('WETH');
    var tokenSymbol = 'TKN';
    describe('withdraw', function () {
        it('should work by symbol for ETH', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, deployAndAssociateContracts()];
                    case 1:
                        exchange = (_c.sent()).exchange;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, exchange.depositEther({
                                value: helpers_1.minimumTokenQuantity,
                                from: accounts[0]
                            })];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, helpers_1.withdraw(web3, exchange, {
                                nonce: uuid_1.v1(),
                                wallet: accounts[0],
                                quantity: helpers_1.minimumDecimalQuantity,
                                autoDispatchEnabled: true,
                                asset: helpers_1.ethSymbol
                            }, accounts[0])];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, assertWithdrawnEvent(exchange, accounts[0], lib_1.ethAddress, helpers_1.ethSymbol, helpers_1.minimumDecimalQuantity)];
                    case 5:
                        _c.sent();
                        _a = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(accounts[0], lib_1.ethAddress)];
                    case 6:
                        _a.apply(void 0, [(_c.sent()).toString()]).to.equal('0');
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInPipsByAddress(accounts[0], lib_1.ethAddress)];
                    case 7:
                        _b.apply(void 0, [(_c.sent()).toString()]).to.equal('0');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work by address for ETH', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, deployAndAssociateContracts()];
                    case 1:
                        exchange = (_c.sent()).exchange;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, exchange.depositEther({
                                value: helpers_1.minimumTokenQuantity,
                                from: accounts[0]
                            })];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, helpers_1.withdraw(web3, exchange, {
                                nonce: uuid_1.v1(),
                                wallet: accounts[0],
                                quantity: helpers_1.minimumDecimalQuantity,
                                autoDispatchEnabled: true,
                                assetContractAddress: lib_1.ethAddress
                            }, accounts[0])];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, assertWithdrawnEvent(exchange, accounts[0], lib_1.ethAddress, helpers_1.ethSymbol, helpers_1.minimumDecimalQuantity)];
                    case 5:
                        _c.sent();
                        _a = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(accounts[0], lib_1.ethAddress)];
                    case 6:
                        _a.apply(void 0, [(_c.sent()).toString()]).to.equal('0');
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInPipsByAddress(accounts[0], lib_1.ethAddress)];
                    case 7:
                        _b.apply(void 0, [(_c.sent()).toString()]).to.equal('0');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work by symbol for token', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, deployAndAssociateContracts()];
                    case 1:
                        exchange = (_c.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _c.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, token.approve(exchange.address, helpers_1.minimumTokenQuantity)];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, exchange.depositTokenByAddress(token.address, helpers_1.minimumTokenQuantity)];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, helpers_1.withdraw(web3, exchange, {
                                nonce: uuid_1.v1(),
                                wallet: accounts[0],
                                quantity: helpers_1.minimumDecimalQuantity,
                                autoDispatchEnabled: true,
                                asset: tokenSymbol
                            }, accounts[0])];
                    case 6:
                        _c.sent();
                        return [4 /*yield*/, assertWithdrawnEvent(exchange, accounts[0], token.address, tokenSymbol, helpers_1.minimumDecimalQuantity)];
                    case 7:
                        _c.sent();
                        _a = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(accounts[0], lib_1.ethAddress)];
                    case 8:
                        _a.apply(void 0, [(_c.sent()).toString()]).to.equal('0');
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInPipsByAddress(accounts[0], lib_1.ethAddress)];
                    case 9:
                        _b.apply(void 0, [(_c.sent()).toString()]).to.equal('0');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work by symbol for non-compliant token', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, deployAndAssociateContracts()];
                    case 1:
                        exchange = (_c.sent()).exchange;
                        return [4 /*yield*/, NonCompliantToken["new"]()];
                    case 2:
                        token = _c.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 18)];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, token.approve(exchange.address, helpers_1.minimumTokenQuantity)];
                    case 6:
                        _c.sent();
                        return [4 /*yield*/, exchange.depositTokenByAddress(token.address, helpers_1.minimumTokenQuantity)];
                    case 7:
                        _c.sent();
                        return [4 /*yield*/, helpers_1.withdraw(web3, exchange, {
                                nonce: uuid_1.v1(),
                                wallet: accounts[0],
                                quantity: helpers_1.minimumDecimalQuantity,
                                autoDispatchEnabled: true,
                                asset: tokenSymbol
                            }, accounts[0])];
                    case 8:
                        _c.sent();
                        return [4 /*yield*/, assertWithdrawnEvent(exchange, accounts[0], token.address, tokenSymbol, helpers_1.minimumDecimalQuantity)];
                    case 9:
                        _c.sent();
                        _a = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(accounts[0], lib_1.ethAddress)];
                    case 10:
                        _a.apply(void 0, [(_c.sent()).toString()]).to.equal('0');
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInPipsByAddress(accounts[0], lib_1.ethAddress)];
                    case 11:
                        _b.apply(void 0, [(_c.sent()).toString()]).to.equal('0');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should deduct fee', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, tokenBalanceBefore, withdrawalAmount, _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, deployAndAssociateContracts()];
                    case 1:
                        exchange = (_e.sent()).exchange;
                        return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, tokenSymbol)];
                    case 2:
                        token = _e.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _e.sent();
                        return [4 /*yield*/, exchange.setFeeWallet(accounts[1])];
                    case 4:
                        _e.sent();
                        return [4 /*yield*/, token.balanceOf(accounts[0])];
                    case 5:
                        tokenBalanceBefore = (_e.sent()).toString();
                        withdrawalAmount = new bignumber_js_1["default"](helpers_1.minimumDecimalQuantity)
                            .multipliedBy(100)
                            .toFixed(8);
                        return [4 /*yield*/, token.approve(exchange.address, lib_1.decimalToAssetUnits(withdrawalAmount, 18))];
                    case 6:
                        _e.sent();
                        return [4 /*yield*/, exchange.depositTokenByAddress(token.address, lib_1.decimalToAssetUnits(withdrawalAmount, 18))];
                    case 7:
                        _e.sent();
                        return [4 /*yield*/, helpers_1.withdraw(web3, exchange, {
                                nonce: uuid_1.v1(),
                                wallet: accounts[0],
                                quantity: withdrawalAmount,
                                autoDispatchEnabled: true,
                                asset: tokenSymbol
                            }, accounts[0], helpers_1.minimumDecimalQuantity)];
                    case 8:
                        _e.sent();
                        return [4 /*yield*/, assertWithdrawnEvent(exchange, accounts[0], token.address, tokenSymbol, withdrawalAmount)];
                    case 9:
                        _e.sent();
                        _a = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(accounts[0], token.address)];
                    case 10:
                        _a.apply(void 0, [(_e.sent()).toString()]).to.equal('0');
                        _b = expect;
                        return [4 /*yield*/, exchange.loadBalanceInPipsByAddress(accounts[0], token.address)];
                    case 11:
                        _b.apply(void 0, [(_e.sent()).toString()]).to.equal('0');
                        _c = expect;
                        return [4 /*yield*/, exchange.loadBalanceInAssetUnitsByAddress(accounts[1], token.address)];
                    case 12:
                        _c.apply(void 0, [(_e.sent()).toString()]).to.equal(helpers_1.minimumTokenQuantity);
                        _d = expect;
                        return [4 /*yield*/, token.balanceOf(accounts[0])];
                    case 13:
                        _d.apply(void 0, [(_e.sent()).toString()]).to.equal(new bignumber_js_1["default"](tokenBalanceBefore)
                            .minus(new bignumber_js_1["default"](helpers_1.minimumTokenQuantity))
                            .toFixed(0));
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for unknown token', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, Token["new"]()];
                    case 2:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, helpers_1.withdraw(web3, exchange, {
                                nonce: uuid_1.v1(),
                                wallet: accounts[0],
                                quantity: helpers_1.minimumDecimalQuantity,
                                autoDispatchEnabled: true,
                                assetContractAddress: token.address
                            }, accounts[0])];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_1 = _a.sent();
                        error = e_1;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/no confirmed asset found/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert when token skims from transfer', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, token, error, e_2, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, SkimmingToken["new"]()];
                    case 3:
                        token = _a.sent();
                        return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, 18)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, 18)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, token.approve(exchange.address, helpers_1.minimumTokenQuantity)];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, exchange.depositTokenByAddress(token.address, helpers_1.minimumTokenQuantity)];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, token.setShouldSkim(true)];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9:
                        _a.trys.push([9, 11, , 12]);
                        return [4 /*yield*/, helpers_1.withdraw(web3, exchange, {
                                nonce: uuid_1.v1(),
                                wallet: accounts[0],
                                quantity: helpers_1.minimumDecimalQuantity,
                                autoDispatchEnabled: true,
                                asset: tokenSymbol
                            }, accounts[0])];
                    case 10:
                        _a.sent();
                        return [3 /*break*/, 12];
                    case 11:
                        e_2 = _a.sent();
                        error = e_2;
                        return [3 /*break*/, 12];
                    case 12:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/ transfer success without expected balance change/i);
                        return [4 /*yield*/, exchange.getPastEvents('Withdrawn', {
                                fromBlock: 0
                            })];
                    case 13:
                        events = _a.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(0);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for invalid signature', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, withdrawal, withdrawalStruct, _a, _b, error, e_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, deployAndAssociateContracts()];
                    case 1:
                        exchange = (_c.sent()).exchange;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, exchange.depositEther({
                                value: helpers_1.minimumTokenQuantity,
                                from: accounts[0]
                            })];
                    case 3:
                        _c.sent();
                        withdrawal = {
                            nonce: uuid_1.v1(),
                            wallet: accounts[0],
                            quantity: helpers_1.minimumDecimalQuantity,
                            autoDispatchEnabled: true,
                            asset: helpers_1.ethSymbol
                        };
                        _a = lib_1.getWithdrawArguments;
                        _b = [withdrawal,
                            '0.00000000'];
                        // Sign with a different wallet
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getWithdrawalHash(withdrawal), accounts[1])];
                    case 4: return [4 /*yield*/, _a.apply(void 0, _b.concat([
                            // Sign with a different wallet
                            _c.sent()]))];
                    case 5:
                        withdrawalStruct = (_c.sent())[0];
                        _c.label = 6;
                    case 6:
                        _c.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, exchange.withdraw(withdrawalStruct)];
                    case 7:
                        _c.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_3 = _c.sent();
                        error = e_3;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/invalid wallet signature/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for exited wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, exchange.depositEther({
                                value: helpers_1.minimumTokenQuantity,
                                from: accounts[0]
                            })];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.exitWallet({ from: accounts[0] })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, helpers_1.withdraw(web3, exchange, {
                                nonce: uuid_1.v1(),
                                wallet: accounts[0],
                                quantity: helpers_1.minimumDecimalQuantity,
                                autoDispatchEnabled: true,
                                asset: helpers_1.ethSymbol
                            }, accounts[0])];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_4 = _a.sent();
                        error = e_4;
                        return [3 /*break*/, 8];
                    case 8:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/wallet exited/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for excessive fee', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, exchange.depositEther({
                                value: helpers_1.minimumTokenQuantity,
                                from: accounts[0]
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, helpers_1.withdraw(web3, exchange, {
                                nonce: uuid_1.v1(),
                                wallet: accounts[0],
                                quantity: helpers_1.minimumDecimalQuantity,
                                autoDispatchEnabled: true,
                                asset: helpers_1.ethSymbol
                            }, accounts[0], helpers_1.minimumDecimalQuantity)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_5 = _a.sent();
                        error = e_5;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/excessive withdrawal fee/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for double withdrawal', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, withdrawal, withdrawalStruct, _a, _b, error, e_6;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, deployAndAssociateContracts()];
                    case 1:
                        exchange = (_c.sent()).exchange;
                        return [4 /*yield*/, exchange.setDispatcher(accounts[0])];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, exchange.depositEther({
                                value: (BigInt(helpers_1.minimumTokenQuantity) * BigInt(2)).toString(),
                                from: accounts[0]
                            })];
                    case 3:
                        _c.sent();
                        withdrawal = {
                            nonce: uuid_1.v1(),
                            wallet: accounts[0],
                            quantity: helpers_1.minimumDecimalQuantity,
                            autoDispatchEnabled: true,
                            asset: helpers_1.ethSymbol
                        };
                        _a = lib_1.getWithdrawArguments;
                        _b = [withdrawal,
                            '0'];
                        return [4 /*yield*/, helpers_1.getSignature(web3, lib_1.getWithdrawalHash(withdrawal), accounts[0])];
                    case 4: return [4 /*yield*/, _a.apply(void 0, _b.concat([_c.sent()]))];
                    case 5:
                        withdrawalStruct = (_c.sent())[0];
                        return [4 /*yield*/, exchange.withdraw(withdrawalStruct)];
                    case 6:
                        _c.sent();
                        _c.label = 7;
                    case 7:
                        _c.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, exchange.withdraw(withdrawalStruct)];
                    case 8:
                        _c.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        e_6 = _c.sent();
                        error = e_6;
                        return [3 /*break*/, 10];
                    case 10:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/already withdrawn/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    var deployAndAssociateContracts = function (blockDelay) {
        if (blockDelay === void 0) { blockDelay = 0; }
        return __awaiter(void 0, void 0, void 0, function () {
            var _a, exchange, governance, _b, _c, _d, _e, _f, custodian;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _c = (_b = Promise).all;
                        _e = (_d = Exchange)["new"];
                        return [4 /*yield*/, BalanceMigrationSourceMock["new"]()];
                    case 1:
                        _f = [(_g.sent()).address];
                        return [4 /*yield*/, WETH["new"]()];
                    case 2: return [4 /*yield*/, _c.apply(_b, [[
                                _e.apply(_d, _f.concat([(_g.sent()).address])),
                                Governance["new"](blockDelay)
                            ]])];
                    case 3:
                        _a = _g.sent(), exchange = _a[0], governance = _a[1];
                        return [4 /*yield*/, Custodian["new"](exchange.address, governance.address)];
                    case 4:
                        custodian = _g.sent();
                        return [4 /*yield*/, exchange.setCustodian(custodian.address)];
                    case 5:
                        _g.sent();
                        return [4 /*yield*/, exchange.setDepositIndex(1)];
                    case 6:
                        _g.sent();
                        return [2 /*return*/, { custodian: custodian, exchange: exchange, governance: governance }];
                }
            });
        });
    };
    var assertWithdrawnEvent = function (exchange, walletAddress, assetAddress, assetSymbol, decimalQuantity) { return __awaiter(void 0, void 0, void 0, function () {
        var events;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exchange.getPastEvents('Withdrawn', {
                        fromBlock: 0
                    })];
                case 1:
                    events = _a.sent();
                    expect(events).to.be.an('array');
                    expect(events.length).to.equal(1);
                    expect(events[0].returnValues.wallet).to.equal(walletAddress);
                    expect(events[0].returnValues.assetAddress).to.equal(assetAddress);
                    expect(events[0].returnValues.assetSymbol).to.equal(assetSymbol);
                    expect(events[0].returnValues.quantityInPips).to.equal(lib_1.decimalToPips(decimalQuantity));
                    expect(events[0].returnValues.newExchangeBalanceInPips).to.equal(lib_1.decimalToPips('0'));
                    expect(events[0].returnValues.newExchangeBalanceInAssetUnits).to.equal('0');
                    return [2 /*return*/];
            }
        });
    }); };
});
