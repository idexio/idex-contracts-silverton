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
exports.increaseBlockTimestamp = exports.withdraw = exports.getSignature = exports.deployAndRegisterToken = exports.deployAndAssociateContracts = exports.minimumTokenQuantity = exports.minimumDecimalQuantity = exports.ethSymbol = void 0;
var lib_1 = require("../../lib");
exports.ethSymbol = 'BNB';
// TODO Test tokens with decimals other than 18
exports.minimumDecimalQuantity = '0.00000001';
exports.minimumTokenQuantity = lib_1.decimalToAssetUnits(exports.minimumDecimalQuantity, 18);
var deployAndAssociateContracts = function (blockDelay, balanceMigrationSourceAddress) {
    if (blockDelay === void 0) { blockDelay = 0; }
    return __awaiter(void 0, void 0, void 0, function () {
        var BalanceMigrationSourceMock, Custodian, Exchange, Governance, WETH, weth, Farm, Token, rewardToken, farm, balanceMigrationSource, _a, exchange, governance, custodian;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    BalanceMigrationSourceMock = artifacts.require('BalanceMigrationSourceMock');
                    Custodian = artifacts.require('Custodian');
                    Exchange = artifacts.require('Exchange');
                    Governance = artifacts.require('Governance');
                    WETH = artifacts.require('WETH');
                    return [4 /*yield*/, WETH["new"]()];
                case 1:
                    weth = _b.sent();
                    Farm = artifacts.require('Farm');
                    Token = artifacts.require('TestToken');
                    return [4 /*yield*/, Token["new"]()];
                case 2:
                    rewardToken = _b.sent();
                    return [4 /*yield*/, Farm["new"](rewardToken.address, 1)];
                case 3:
                    farm = _b.sent();
                    return [4 /*yield*/, (balanceMigrationSourceAddress
                            ? BalanceMigrationSourceMock.at(balanceMigrationSourceAddress)
                            : BalanceMigrationSourceMock["new"]())];
                case 4:
                    balanceMigrationSource = _b.sent();
                    return [4 /*yield*/, Promise.all([
                            Exchange["new"](balanceMigrationSource.address, farm.address, weth.address, weth.address),
                            Governance["new"](blockDelay),
                        ])];
                case 5:
                    _a = _b.sent(), exchange = _a[0], governance = _a[1];
                    return [4 /*yield*/, Custodian["new"](exchange.address, governance.address)];
                case 6:
                    custodian = _b.sent();
                    return [4 /*yield*/, exchange.setCustodian(custodian.address)];
                case 7:
                    _b.sent();
                    return [4 /*yield*/, governance.setCustodian(custodian.address)];
                case 8:
                    _b.sent();
                    return [4 /*yield*/, exchange.setDepositIndex(1)];
                case 9:
                    _b.sent();
                    return [2 /*return*/, {
                            balanceMigrationSource: balanceMigrationSource,
                            custodian: custodian,
                            exchange: exchange,
                            farm: farm,
                            governance: governance,
                            weth: weth
                        }];
            }
        });
    });
};
exports.deployAndAssociateContracts = deployAndAssociateContracts;
var deployAndRegisterToken = function (exchange, tokenSymbol, decimals) {
    if (decimals === void 0) { decimals = 18; }
    return __awaiter(void 0, void 0, void 0, function () {
        var Token, token;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    Token = artifacts.require('TestToken');
                    return [4 /*yield*/, Token["new"]()];
                case 1:
                    token = _a.sent();
                    return [4 /*yield*/, exchange.registerToken(token.address, tokenSymbol, decimals)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, exchange.confirmTokenRegistration(token.address, tokenSymbol, decimals)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, token];
            }
        });
    });
};
exports.deployAndRegisterToken = deployAndRegisterToken;
var getSignature = function (web3, data, wallet) { return __awaiter(void 0, void 0, void 0, function () {
    var signature, v, vHex;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, web3.eth.sign(data, wallet)];
            case 1:
                signature = _a.sent();
                v = parseInt(signature.slice(130, 132), 16);
                if (v < 27) {
                    v += 27;
                }
                vHex = v.toString(16);
                return [2 /*return*/, signature.slice(0, 130) + vHex];
        }
    });
}); };
exports.getSignature = getSignature;
var withdraw = function (web3, exchange, withdrawal, wallet, gasFee) {
    if (gasFee === void 0) { gasFee = '0.00000000'; }
    return __awaiter(void 0, void 0, void 0, function () {
        var withdrawalStruct, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = lib_1.getWithdrawArguments;
                    _b = [withdrawal,
                        gasFee];
                    return [4 /*yield*/, exports.getSignature(web3, lib_1.getWithdrawalHash(withdrawal), wallet)];
                case 1: return [4 /*yield*/, _a.apply(void 0, _b.concat([_c.sent()]))];
                case 2:
                    withdrawalStruct = (_c.sent())[0];
                    return [4 /*yield*/, exchange.withdraw(withdrawalStruct)];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.withdraw = withdraw;
// https://docs.nethereum.com/en/latest/ethereum-and-clients/ganache-cli/#implemented-methods
var increaseBlockTimestamp = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, sendRpc('evm_increaseTime', [1])];
            case 1:
                _a.sent(); // 1 second
                return [4 /*yield*/, sendRpc('evm_mine', [])];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.increaseBlockTimestamp = increaseBlockTimestamp;
var sendRpc = function (method, params) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (resolve, reject) {
                web3.currentProvider.send({
                    jsonrpc: '2.0',
                    method: method,
                    params: params,
                    id: new Date().getTime()
                }, function (err, res) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(res);
                    }
                });
            })];
    });
}); };
