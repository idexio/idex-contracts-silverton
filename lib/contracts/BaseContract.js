"use strict";
exports.__esModule = true;
var BaseContract = /** @class */ (function () {
    function BaseContract(contract) {
        this.contract = contract;
    }
    BaseContract.prototype.getAddress = function () {
        return this.contract.address;
    };
    BaseContract.prototype.getEthersContract = function () {
        return this.contract;
    };
    return BaseContract;
}());
exports["default"] = BaseContract;
