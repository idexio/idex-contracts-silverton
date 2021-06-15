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
var helpers_1 = require("./helpers");
var lib_1 = require("../../lib");
// See trade.ts for tests covering executeTrade behavior for invalidated order nonces
contract('Exchange (invalidations)', function (accounts) {
    describe('invalidateOrderNonce', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            it('should work on initial call', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, events;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                        case 1:
                            exchange = (_a.sent()).exchange;
                            return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid_1.v1()))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, exchange.getPastEvents('OrderNonceInvalidated', {
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
            it('should work on subsequent call with a later timestamp', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, events;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                        case 1:
                            exchange = (_a.sent()).exchange;
                            return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid_1.v1()))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid_1.v1()))];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, exchange.getPastEvents('OrderNonceInvalidated', {
                                    fromBlock: 0
                                })];
                        case 4:
                            events = _a.sent();
                            expect(events).to.be.an('array');
                            expect(events.length).to.equal(2);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert for nonce with timestamp too far in the future', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, uuid, error, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                        case 1:
                            exchange = (_a.sent()).exchange;
                            uuid = uuid_1.v1();
                            return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid))];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid_1.v1({ msecs: new Date().getTime() + 48 * 60 * 60 * 1000 })))];
                        case 4:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            e_1 = _a.sent();
                            error = e_1;
                            return [3 /*break*/, 6];
                        case 6:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/nonce timestamp too far in future/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert on subsequent call with same timestamp', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, uuid, error, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                        case 1:
                            exchange = (_a.sent()).exchange;
                            uuid = uuid_1.v1();
                            return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid))];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid))];
                        case 4:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            e_2 = _a.sent();
                            error = e_2;
                            return [3 /*break*/, 6];
                        case 6:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/nonce timestamp already invalidated/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert on subsequent call before block threshold of previous', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, error, e_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                        case 1:
                            exchange = (_a.sent()).exchange;
                            return [4 /*yield*/, exchange.setChainPropagationPeriod(10)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid_1.v1()))];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid_1.v1()))];
                        case 5:
                            _a.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            e_3 = _a.sent();
                            error = e_3;
                            return [3 /*break*/, 7];
                        case 7:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/previous invalidation awaiting chain propagation/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should revert for non-V1 UUID', function () { return __awaiter(void 0, void 0, void 0, function () {
                var exchange, error, e_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                        case 1:
                            exchange = (_a.sent()).exchange;
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, exchange.invalidateOrderNonce(lib_1.uuidToHexString(uuid_1.v4()))];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            e_4 = _a.sent();
                            error = e_4;
                            return [3 /*break*/, 5];
                        case 5:
                            expect(error).to.not.be.undefined;
                            expect(error.message).to.match(/must be v1 UUID/i);
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    }); });
});
