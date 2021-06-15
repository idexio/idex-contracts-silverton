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
contract('Exchange (exits)', function (accounts) {
    describe('exitWallet', function () {
        it('should work for non-exited wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, events, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_c.sent()).exchange;
                        return [4 /*yield*/, exchange.exitWallet({ from: accounts[0] })];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, exchange.getPastEvents('WalletExited', {
                                fromBlock: 0
                            })];
                    case 3:
                        events = _c.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        expect(events[0].returnValues.wallet).to.equal(accounts[0]);
                        _b = (_a = expect(parseInt(events[0].returnValues.effectiveBlockNumber, 10)).to).equal;
                        return [4 /*yield*/, web3.eth.getBlockNumber()];
                    case 4:
                        _b.apply(_a, [_c.sent()]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for wallet already exited', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.exitWallet({ from: accounts[0] })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exchange.exitWallet({ from: accounts[0] })];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        error = e_1;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/wallet already exited/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('withdrawExit', function () {
        it('should work for ETH', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.depositEther({
                                value: helpers_1.minimumTokenQuantity,
                                from: accounts[0]
                            })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, exchange.exitWallet({ from: accounts[0] })];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.withdrawExit(lib_1.ethAddress)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, exchange.getPastEvents('WalletExitWithdrawn', {
                                fromBlock: 0
                            })];
                    case 5:
                        events = _a.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        expect(events[0].returnValues.wallet).to.equal(accounts[0]);
                        expect(events[0].returnValues.assetAddress).to.equal(lib_1.ethAddress);
                        expect(lib_1.pipsToAssetUnits(events[0].returnValues.quantityInPips, 18)).to.equal(helpers_1.minimumTokenQuantity);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for wallet not exited', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchange.withdrawExit(lib_1.ethAddress)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_2 = _a.sent();
                        error = e_2;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/wallet exit not finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for wallet exit not finalized', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.setChainPropagationPeriod(10)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, exchange.exitWallet({ from: accounts[0] })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, exchange.withdrawExit(lib_1.ethAddress)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_3 = _a.sent();
                        error = e_3;
                        return [3 /*break*/, 7];
                    case 7:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/wallet exit not finalized/i);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for asset with no balance', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.exitWallet({ from: accounts[0] })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, exchange.withdrawExit(lib_1.ethAddress)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_4 = _a.sent();
                        error = e_4;
                        return [3 /*break*/, 6];
                    case 6:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/no balance for asset/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('clearWalletExit', function () {
        it('should work for non-exited wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        return [4 /*yield*/, exchange.exitWallet({ from: accounts[0] })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, exchange.clearWalletExit({ from: accounts[0] })];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, exchange.getPastEvents('WalletExitCleared', {
                                fromBlock: 0
                            })];
                    case 4:
                        events = _a.sent();
                        expect(events).to.be.an('array');
                        expect(events.length).to.equal(1);
                        expect(events[0].returnValues.wallet).to.equal(accounts[0]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should revert for wallet not exited', function () { return __awaiter(void 0, void 0, void 0, function () {
            var exchange, error, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                    case 1:
                        exchange = (_a.sent()).exchange;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, exchange.clearWalletExit()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_5 = _a.sent();
                        error = e_5;
                        return [3 /*break*/, 5];
                    case 5:
                        expect(error).to.not.be.undefined;
                        expect(error.message).to.match(/wallet not exited/i);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
