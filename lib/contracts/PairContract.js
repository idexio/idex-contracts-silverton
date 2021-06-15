"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var ethers_1 = require("ethers");
var utils = require("./utils");
var BaseContract_1 = require("./BaseContract");
var ethers_contracts_1 = require("../../types/ethers-contracts");
var PairContract = /** @class */ (function (_super) {
    __extends(PairContract, _super);
    function PairContract(address, signerWalletPrivateKey) {
        return _super.call(this, ethers_contracts_1.IIDEXPair__factory.connect(address, signerWalletPrivateKey
            ? new ethers_1.ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
            : utils.loadProvider())) || this;
    }
    return PairContract;
}(BaseContract_1["default"]));
exports["default"] = PairContract;
