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
exports.deployLibrary = exports.WETHContract = exports.PairContract = exports.FactoryContract = exports.ExchangeContract = exports.initRpcApi = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var ethers_1 = require("ethers");
var utils_1 = require("./utils");
exports.initRpcApi = utils_1.initRpcApi;
var ExchangeContract_1 = require("./ExchangeContract");
exports.ExchangeContract = ExchangeContract_1["default"];
var FactoryContract_1 = require("./FactoryContract");
exports.FactoryContract = FactoryContract_1["default"];
var PairContract_1 = require("./PairContract");
exports.PairContract = PairContract_1["default"];
var WETHContract_1 = require("./WETHContract");
exports.WETHContract = WETHContract_1["default"];
function deployLibrary(name, ownerWalletPrivateKey) {
    return __awaiter(this, void 0, void 0, function () {
        var bytecode, owner, library;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    bytecode = loadLibraryBytecode(name);
                    owner = new ethers_1.ethers.Wallet(ownerWalletPrivateKey, utils_1.loadProvider());
                    return [4 /*yield*/, new ethers_1.ethers.ContractFactory([], bytecode, owner).deploy()];
                case 1:
                    library = _a.sent();
                    return [4 /*yield*/, library.deployTransaction.wait()];
                case 2:
                    _a.sent();
                    return [2 /*return*/, library.address];
            }
        });
    });
}
exports.deployLibrary = deployLibrary;
var libraryNameToBytecodeMap = new Map();
function loadLibraryBytecode(name) {
    if (!libraryNameToBytecodeMap.has(name)) {
        var bytecode = JSON.parse(fs_1["default"]
            .readFileSync(path_1["default"].join(__dirname, '..', '..', 'contracts', name + ".json"))
            .toString('utf8')).bytecode;
        libraryNameToBytecodeMap.set(name, bytecode);
    }
    return libraryNameToBytecodeMap.get(name); // Will never be undefined as it gets set above
}
