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
exports.deployPancakeCoreAndCreateETHPool = exports.deployPancakeCoreAndCreatePool = exports.deployContractsAndCreateHybridETHPool = exports.deployContractsAndCreateHybridPool = void 0;
var bignumber_js_1 = require("bignumber.js");
var uuid_1 = require("uuid");
var lib_1 = require("../../lib");
var helpers_1 = require("./helpers");
var token0Symbol = 'DIL';
contract('Exchange (liquidity pools)', function (_a) {
    var ownerWallet = _a[0];
    describe.only('fundPool', function () {
        it('should work', function () { return __awaiter(void 0, void 0, void 0, function () {
            var depositQuantity, _a, custodian, exchange, token, weth, tokenEvents, wethEvents, pool;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        depositQuantity = '1.00000000';
                        return [4 /*yield*/, deployContractsAndCreateHybridETHPool(depositQuantity, depositQuantity, ownerWallet)];
                    case 1:
                        _a = _b.sent(), custodian = _a.custodian, exchange = _a.exchange, token = _a.token, weth = _a.weth;
                        return [4 /*yield*/, token.getPastEvents('Transfer', {
                                fromBlock: 0
                            })];
                    case 2:
                        tokenEvents = _b.sent();
                        expect(tokenEvents).to.be.an('array');
                        expect(tokenEvents.length).to.equal(4);
                        expect(tokenEvents[2].returnValues.value).to.equal(lib_1.decimalToAssetUnits(depositQuantity, 18));
                        expect(tokenEvents[2].returnValues.to).to.equal(exchange.address);
                        expect(tokenEvents[3].returnValues.value).to.equal(lib_1.decimalToAssetUnits(depositQuantity, 18));
                        expect(tokenEvents[3].returnValues.to).to.equal(custodian.address);
                        return [4 /*yield*/, weth.getPastEvents('Transfer', {
                                fromBlock: 0
                            })];
                    case 3:
                        wethEvents = _b.sent();
                        expect(wethEvents).to.be.an('array');
                        expect(wethEvents.length).to.equal(2);
                        expect(wethEvents[1].returnValues.wad).to.equal(lib_1.decimalToAssetUnits(depositQuantity, 18));
                        expect(wethEvents[1].returnValues.dst).to.equal(exchange.address);
                        return [4 /*yield*/, exchange.loadLiquidityPoolByAssetAddresses(token.address, lib_1.ethAddress)];
                    case 4:
                        pool = _b.sent();
                        expect(pool.baseAssetReserveInPips).to.equal(lib_1.decimalToPips(depositQuantity));
                        expect(pool.quoteAssetReserveInPips).to.equal(lib_1.decimalToPips(depositQuantity));
                        return [2 /*return*/];
                }
            });
        }); });
        /*
        it('should fail when no liquidity has been minted', async () => {
          const { custodian, exchange, weth } = await deployAndAssociateContracts();
          const token = await deployAndRegisterToken(exchange, token0Symbol);
          const { factory, pair } = await deployPancakeCoreAndCreateETHPool(
            ownerWallet,
            custodian,
            token,
            weth,
            ownerWallet,
          );
          await exchange.setPairFactoryAddress(factory.address);
    
          let error;
          try {
            await exchange.promotePool(token.address, ethAddress, pair.address);
          } catch (e) {
            error = e;
          }
          expect(error).to.not.be.undefined;
          expect(error.message).to.match(/no liquidity minted/i);
        });
    
        it('should fail when pair address does not match factory', async () => {
          const { custodian, exchange, weth } = await deployAndAssociateContracts();
          const token = await deployAndRegisterToken(exchange, token0Symbol);
          const { factory } = await deployPancakeCoreAndCreateETHPool(
            ownerWallet,
            custodian,
            token,
            weth,
            ownerWallet,
          );
          await exchange.setPairFactoryAddress(factory.address);
    
          let error;
          try {
            await exchange.promotePool(token.address, ethAddress, weth.address);
          } catch (e) {
            error = e;
          }
          expect(error).to.not.be.undefined;
          expect(error.message).to.match(/pair does not match factory/i);
        });
    
        it('should fail on duplicate market', async () => {
          const depositQuantity = '1.00000000';
          const {
            exchange,
            pair,
            token,
          } = await deployContractsAndCreateHybridETHPool(
            depositQuantity,
            depositQuantity,
            ownerWallet,
          );
    
          let error;
          try {
            await exchange.promotePool(token.address, ethAddress, pair.address);
          } catch (e) {
            error = e;
          }
          expect(error).to.not.be.undefined;
          expect(error.message).to.match(/pool already exists/i);
        });
        */
    });
    /*
    describe('demotePool', () => {
      it('should work', async () => {
        const depositQuantity = '1.00000000';
        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
  
        await exchange.demotePool(token.address, ethAddress);
  
        let error;
        try {
          await exchange.loadLiquidityPoolByAssetAddresses(
            token.address,
            ethAddress,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/no pool found/i);
      });
    });
  
    describe('addLiquidity', () => {
      it('should work with no fees', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const transferEvents = await pair.getPastEvents('Transfer', {
          fromBlock: 0,
        });
        expect(transferEvents).to.be.an('array');
        expect(transferEvents.length).to.equal(3);
        expect(transferEvents[2].returnValues.value).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
  
        const mintEvents = await pair.getPastEvents('Mint', {
          fromBlock: 0,
        });
        expect(mintEvents).to.be.an('array');
        expect(mintEvents.length).to.equal(2);
        expect(mintEvents[1].returnValues.amount0).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(mintEvents[1].returnValues.amount1).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
  
      it('should work with fees', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { execution } = await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
          true,
        );
  
        const transferEvents = await pair.getPastEvents('Transfer', {
          fromBlock: 0,
        });
        expect(transferEvents).to.be.an('array');
        expect(transferEvents.length).to.equal(3);
        expect(transferEvents[2].returnValues.value).to.equal(
          execution.liquidity,
        );
  
        const mintEvents = await pair.getPastEvents('Mint', {
          fromBlock: 0,
        });
        expect(mintEvents).to.be.an('array');
        expect(mintEvents.length).to.equal(2);
        expect(mintEvents[1].returnValues.amount0).to.equal(execution.liquidity);
        expect(mintEvents[1].returnValues.amount1).to.equal(execution.liquidity);
      });
  
      it('should revert when already initiated', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
  
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        await token0.approve(exchange.address, depositQuantityInAssetUnits, {
          from: ownerWallet,
        });
        await token1.approve(exchange.address, depositQuantityInAssetUnits, {
          from: ownerWallet,
        });
  
        const deadline = Date.now() + 10000;
        await exchange.addLiquidity(
          token0.address,
          token1.address,
          depositQuantityInAssetUnits,
          depositQuantityInAssetUnits,
          depositQuantityInAssetUnits,
          depositQuantityInAssetUnits,
          ownerWallet,
          deadline,
        );
  
        let error;
        try {
          await exchange.addLiquidity(
            token0.address,
            token1.address,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            ownerWallet,
            deadline,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/already initiated/i);
      });
  
      it('should revert past deadline', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
  
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        await token0.approve(exchange.address, depositQuantityInAssetUnits, {
          from: ownerWallet,
        });
        await token1.approve(exchange.address, depositQuantityInAssetUnits, {
          from: ownerWallet,
        });
  
        let error;
        try {
          const deadline =
            ((await web3.eth.getBlock('latest')).timestamp as number) - 10000;
          await exchange.addLiquidity(
            token0.address,
            token1.address,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            ownerWallet,
            deadline,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/idex: expired/i);
      });
    });
  
    describe('addLiquidityETH', () => {
      it('should work with no fees', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token,
        );
  
        const transferEvents = await pair.getPastEvents('Transfer', {
          fromBlock: 0,
        });
        expect(transferEvents).to.be.an('array');
        expect(transferEvents.length).to.equal(3);
        expect(transferEvents[2].returnValues.value).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
  
        const mintEvents = await pair.getPastEvents('Mint', {
          fromBlock: 0,
        });
        expect(mintEvents).to.be.an('array');
        expect(mintEvents.length).to.equal(2);
        expect(mintEvents[1].returnValues.amount0).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(mintEvents[1].returnValues.amount1).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
  
      it('should work with fees', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { execution } = await addLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token,
          true,
        );
  
        const transferEvents = await pair.getPastEvents('Transfer', {
          fromBlock: 0,
        });
        expect(transferEvents).to.be.an('array');
        expect(transferEvents.length).to.equal(3);
        expect(transferEvents[2].returnValues.value).to.equal(
          execution.liquidity,
        );
  
        const mintEvents = await pair.getPastEvents('Mint', {
          fromBlock: 0,
        });
        expect(mintEvents).to.be.an('array');
        expect(mintEvents.length).to.equal(2);
        expect(mintEvents[1].returnValues.amount0).to.equal(execution.liquidity);
        expect(mintEvents[1].returnValues.amount1).to.equal(execution.liquidity);
      });
  
      it('should credit balances when to is Custodian', async () => {
        const depositQuantity = '1.00000000';
        const {
          custodian,
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token,
          false,
          custodian.address,
        );
  
        const lpBalance = await exchange.loadBalanceInAssetUnitsByAddress(
          ownerWallet,
          pair.address,
        );
        expect(lpBalance.toString()).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
  
      it('should revert when already initiated', async () => {
        const depositQuantity = '1.00000000';
        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        await token.approve(
          exchange.address,
          new BigNumber(depositQuantityInAssetUnits).times(2).toString(),
          {
            from: ownerWallet,
          },
        );
  
        const deadline = Date.now() + 10000;
        await exchange.addLiquidityETH(
          token.address,
          depositQuantityInAssetUnits,
          depositQuantityInAssetUnits,
          depositQuantityInAssetUnits,
          ownerWallet,
          deadline,
          { value: depositQuantityInAssetUnits },
        );
  
        let error;
        try {
          await exchange.addLiquidityETH(
            token.address,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            ownerWallet,
            deadline,
            { value: depositQuantityInAssetUnits },
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/already initiated/i);
      });
  
      it('should revert past deadline', async () => {
        const depositQuantity = '1.00000000';
        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        await token.approve(exchange.address, depositQuantityInAssetUnits, {
          from: ownerWallet,
        });
  
        let error;
        try {
          const deadline =
            ((await web3.eth.getBlock('latest')).timestamp as number) - 10000;
          await exchange.addLiquidityETH(
            token.address,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            ownerWallet,
            deadline,
            { value: depositQuantityInAssetUnits },
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/idex: expired/i);
      });
    });
  
    describe('executeAddLiquidity', () => {
      it('should work when initiated off-chain', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { addition, execution } = await generateOffChainLiquidityAddition(
          depositQuantityInAssetUnits,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
        const signature = await getSignature(
          web3,
          getLiquidityAdditionHash(addition),
          ownerWallet,
        );
  
        // https://github.com/microsoft/TypeScript/issues/28486
        await (exchange.executeAddLiquidity as any)(
          ...getAddLiquidityArguments(addition, signature, execution),
          { from: ownerWallet },
        );
  
        const transferEvents = await pair.getPastEvents('Transfer', {
          fromBlock: 0,
        });
        expect(transferEvents).to.be.an('array');
        expect(transferEvents.length).to.equal(3);
        expect(transferEvents[2].returnValues.value).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
  
        const mintEvents = await pair.getPastEvents('Mint', {
          fromBlock: 0,
        });
        expect(mintEvents).to.be.an('array');
        expect(mintEvents.length).to.equal(2);
        expect(mintEvents[1].returnValues.amount0).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(mintEvents[1].returnValues.amount1).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
  
      it('should revert duplicate initiated off-chain', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { addition, execution } = await generateOffChainLiquidityAddition(
          depositQuantityInAssetUnits,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
        const signature = await getSignature(
          web3,
          getLiquidityAdditionHash(addition),
          ownerWallet,
        );
  
        // https://github.com/microsoft/TypeScript/issues/28486
        await (exchange.executeAddLiquidity as any)(
          ...getAddLiquidityArguments(addition, signature, execution),
          { from: ownerWallet },
        );
  
        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executeAddLiquidity as any)(
            ...getAddLiquidityArguments(addition, signature, execution),
            { from: ownerWallet },
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/not executable from off-chain/i);
      });
  
      it('should revert invalid signature initiated off-chain', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { addition, execution } = await generateOffChainLiquidityAddition(
          depositQuantityInAssetUnits,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
        const signature = await getSignature(
          web3,
          getLiquidityAdditionHash(addition),
          ownerWallet,
        );
        addition.deadline = 5;
  
        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executeAddLiquidity as any)(
            ...getAddLiquidityArguments(addition, signature, execution),
            { from: ownerWallet },
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid signature/i);
      });
  
      it('should revert when not initiated on-chain', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const addition = {
          signatureHashVersion: 2,
          origination: 0,
          nonce: 0,
          wallet: ownerWallet,
          assetA: token0.address,
          assetB: token1.address,
          amountADesired: depositQuantityInAssetUnits,
          amountBDesired: depositQuantityInAssetUnits,
          amountAMin: depositQuantityInAssetUnits,
          amountBMin: depositQuantityInAssetUnits,
          to: ownerWallet,
          deadline: Date.now() + 10000,
          signature: '0x',
        };
        const execution = {
          liquidity: depositQuantityInAssetUnits,
          amountA: depositQuantityInAssetUnits,
          amountB: depositQuantityInAssetUnits,
          feeAmountA: 0,
          feeAmountB: 0,
          baseAssetAddress: token0.address,
          quoteAssetAddress: token1.address,
        };
  
        let error;
        try {
          await exchange.executeAddLiquidity(addition, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/not executable from on-chain/i);
      });
  
      it('should revert on asset address mismatch', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { addition, execution } = await generateOffChainLiquidityAddition(
          depositQuantityInAssetUnits,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
        addition.assetA = addition.assetB;
        const signature = await getSignature(
          web3,
          getLiquidityAdditionHash(addition),
          ownerWallet,
        );
  
        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executeAddLiquidity as any)(
            ...getAddLiquidityArguments(addition, signature, execution),
            { from: ownerWallet },
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/asset address mismatch/i);
      });
  
      it('should revert when assetA minimum not met', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { addition, execution } = await generateOnChainLiquidityAddition(
          exchange,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.amountA = decimalToAssetUnits('0.90000000', 18);
  
        let error;
        try {
          await exchange.executeAddLiquidity(addition, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid amountA/i);
      });
  
      it('should revert when assetB minimum not met', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { addition, execution } = await generateOnChainLiquidityAddition(
          exchange,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.amountB = decimalToAssetUnits('0.90000000', 18);
  
        let error;
        try {
          await exchange.executeAddLiquidity(addition, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid amountB/i);
      });
  
      it('should revert for excessive A fee', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { addition, execution } = await generateOnChainLiquidityAddition(
          exchange,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.feeAmountA = decimalToAssetUnits('0.50000000', 18);
  
        let error;
        try {
          await exchange.executeAddLiquidity(addition, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/excessive A fee/i);
      });
  
      it('should revert for excessive B fee', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { addition, execution } = await generateOnChainLiquidityAddition(
          exchange,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.feeAmountB = decimalToAssetUnits('0.50000000', 18);
  
        let error;
        try {
          await exchange.executeAddLiquidity(addition, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/excessive B fee/i);
      });
  
      it('should revert for invalid liquidity', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { addition, execution } = await generateOnChainLiquidityAddition(
          exchange,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.liquidity = decimalToAssetUnits('1.50000000', 18);
  
        let error;
        try {
          await exchange.executeAddLiquidity(addition, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid liquidity/i);
      });
  
      it('should revert for invalid signatureHashVersion', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const { addition, execution } = await generateOnChainLiquidityAddition(
          exchange,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        addition.signatureHashVersion = 88;
  
        let error;
        try {
          await exchange.executeAddLiquidity(addition, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/signature hash version invalid/i);
      });
    });
  
    describe('removeLiquidity', () => {
      it('should work with no fees', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        await removeLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          pair,
          token0,
          token1,
        );
  
        const burnEvents = await pair.getPastEvents('Burn', {
          fromBlock: 0,
        });
        expect(burnEvents).to.be.an('array');
        expect(burnEvents.length).to.equal(1);
        expect(burnEvents[0].returnValues.amount0).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(burnEvents[0].returnValues.amount1).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
  
      it('should work with fees', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { execution } = await removeLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          pair,
          token0,
          token1,
          true,
        );
  
        const burnEvents = await pair.getPastEvents('Burn', {
          fromBlock: 0,
        });
        expect(burnEvents).to.be.an('array');
        expect(burnEvents.length).to.equal(1);
        expect(burnEvents[0].returnValues.amount0).to.equal(execution.amountA);
        expect(burnEvents[0].returnValues.amount1).to.equal(execution.amountB);
      });
  
      it('should credit balances when to is Custodian', async () => {
        const depositQuantity = '1.00000000';
        const {
          custodian,
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        await removeLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          pair,
          token0,
          token1,
          false,
          custodian.address,
        );
  
        const token0Balance = await exchange.loadBalanceInAssetUnitsByAddress(
          ownerWallet,
          token0.address,
        );
        expect(token0Balance.toString()).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        const token1Balance = await exchange.loadBalanceInAssetUnitsByAddress(
          ownerWallet,
          token1.address,
        );
        expect(token1Balance.toString()).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
  
      it('should revert when already initiated', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
        const deadline = Date.now() + 10000;
  
        await pair.approve(exchange.address, depositQuantityInAssetUnits, {
          from: ownerWallet,
        });
        await exchange.removeLiquidity(
          token0.address,
          token1.address,
          depositQuantityInAssetUnits,
          depositQuantityInAssetUnits,
          depositQuantityInAssetUnits,
          ownerWallet,
          deadline,
        );
  
        let error;
        try {
          await pair.approve(exchange.address, depositQuantityInAssetUnits, {
            from: ownerWallet,
          });
          await exchange.removeLiquidity(
            token0.address,
            token1.address,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            ownerWallet,
            deadline,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/already initiated/i);
      });
  
      it('should revert past deadline', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        let error;
        try {
          const deadline =
            ((await web3.eth.getBlock('latest')).timestamp as number) - 10000;
  
          await exchange.removeLiquidity(
            token0.address,
            token1.address,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            ownerWallet,
            deadline,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/idex: expired/i);
      });
    });
  
    describe('removeLiquidityETH', () => {
      it('should work with no fees', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token,
        );
  
        await removeLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          pair,
          token,
        );
  
        const burnEvents = await pair.getPastEvents('Burn', {
          fromBlock: 0,
        });
        expect(burnEvents).to.be.an('array');
        expect(burnEvents.length).to.equal(1);
        expect(burnEvents[0].returnValues.amount0).to.equal(
          depositQuantityInAssetUnits,
        );
        expect(burnEvents[0].returnValues.amount1).to.equal(
          depositQuantityInAssetUnits,
        );
      });
  
      it('should work with fees', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token,
        );
  
        const { execution } = await removeLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          pair,
          token,
          true,
        );
  
        const burnEvents = await pair.getPastEvents('Burn', {
          fromBlock: 0,
        });
        expect(burnEvents).to.be.an('array');
        expect(burnEvents.length).to.equal(1);
        expect(burnEvents[0].returnValues.amount0).to.equal(execution.amountA);
        expect(burnEvents[0].returnValues.amount1).to.equal(execution.amountB);
      });
  
      it('should revert when already initiated', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token,
        );
  
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
        await pair.approve(exchange.address, depositQuantityInAssetUnits, {
          from: ownerWallet,
        });
  
        const deadline = Date.now() + 10000;
        await exchange.removeLiquidityETH(
          token.address,
          depositQuantityInAssetUnits,
          depositQuantityInAssetUnits,
          depositQuantityInAssetUnits,
          ownerWallet,
          deadline,
        );
  
        let error;
        try {
          await exchange.removeLiquidityETH(
            token.address,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            ownerWallet,
            deadline,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/already initiated/i);
      });
  
      it('should revert after deadline', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token,
        );
  
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
        await pair.approve(exchange.address, depositQuantityInAssetUnits, {
          from: ownerWallet,
        });
  
        let error;
        try {
          const deadline =
            ((await web3.eth.getBlock('latest')).timestamp as number) - 10000;
          await exchange.removeLiquidityETH(
            token.address,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            depositQuantityInAssetUnits,
            ownerWallet,
            deadline,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/idex: expired/i);
      });
    });
  
    describe('executeRemoveLiquidity', () => {
      it('should work when initiated off-chain', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOffChainLiquidityRemoval(
          depositQuantityInAssetUnits,
          ownerWallet,
          exchange,
          pair,
          token0,
          token1,
        );
        const signature = await getSignature(
          web3,
          getLiquidityRemovalHash(removal),
          ownerWallet,
        );
  
        // https://github.com/microsoft/TypeScript/issues/28486
        await (exchange.executeRemoveLiquidity as any)(
          ...getRemoveLiquidityArguments(removal, signature, execution),
          { from: ownerWallet },
        );
  
        const burnEvents = await pair.getPastEvents('Burn', {
          fromBlock: 0,
        });
        expect(burnEvents).to.be.an('array');
        expect(burnEvents.length).to.equal(1);
        expect(burnEvents[0].returnValues.amount0).to.equal(
          depositQuantityInAssetUnits,
        );
        expect(burnEvents[0].returnValues.amount1).to.equal(
          depositQuantityInAssetUnits,
        );
      });
  
      it('should revert duplicate initiated off-chain', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOffChainLiquidityRemoval(
          depositQuantityInAssetUnits,
          ownerWallet,
          exchange,
          pair,
          token0,
          token1,
        );
        const signature = await getSignature(
          web3,
          getLiquidityRemovalHash(removal),
          ownerWallet,
        );
  
        // https://github.com/microsoft/TypeScript/issues/28486
        await (exchange.executeRemoveLiquidity as any)(
          ...getRemoveLiquidityArguments(removal, signature, execution),
          { from: ownerWallet },
        );
  
        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
  
          await (exchange.executeRemoveLiquidity as any)(
            ...getRemoveLiquidityArguments(removal, signature, execution),
            { from: ownerWallet },
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/not executable from off-chain/i);
      });
  
      it('should revert invalid signature initiated off-chain', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOffChainLiquidityRemoval(
          depositQuantityInAssetUnits,
          ownerWallet,
          exchange,
          pair,
          token0,
          token1,
        );
        const signature = await getSignature(
          web3,
          getLiquidityRemovalHash(removal),
          ownerWallet,
        );
        removal.deadline = 5;
  
        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
  
          await (exchange.executeRemoveLiquidity as any)(
            ...getRemoveLiquidityArguments(removal, signature, execution),
            { from: ownerWallet },
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid signature/i);
      });
  
      it('should revert when not initiated on-chain', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const removal = {
          signatureHashVersion: 2,
          origination: 0,
          nonce: 0,
          wallet: ownerWallet,
          assetA: token0.address,
          assetB: token1.address,
          liquidity: depositQuantityInAssetUnits,
          amountAMin: depositQuantityInAssetUnits,
          amountBMin: depositQuantityInAssetUnits,
          to: ownerWallet,
          deadline: Date.now() + 10000,
          signature: '0x',
        };
        const execution = {
          liquidity: depositQuantityInAssetUnits,
          amountA: depositQuantityInAssetUnits,
          amountB: depositQuantityInAssetUnits,
          feeAmountA: 0,
          feeAmountB: 0,
          baseAssetAddress: token0.address,
          quoteAssetAddress: token1.address,
        };
  
        let error;
        try {
          await exchange.executeRemoveLiquidity(removal, execution, {
            from: ownerWallet,
          });
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/not executable from on-chain/i);
      });
  
      it('should revert on asset address mismatch', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOffChainLiquidityRemoval(
          depositQuantityInAssetUnits,
          ownerWallet,
          exchange,
          pair,
          token0,
          token1,
        );
        removal.assetA = removal.assetB;
        const signature = await getSignature(
          web3,
          getLiquidityRemovalHash(removal),
          ownerWallet,
        );
  
        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executeRemoveLiquidity as any)(
            ...getRemoveLiquidityArguments(removal, signature, execution),
            { from: ownerWallet },
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/asset address mismatch/i);
      });
  
      it('should revert when liquidity is zero', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOnChainLiquidityRemoval(
          exchange,
          pair,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.amountA = '0';
  
        let error;
        try {
          await exchange.executeRemoveLiquidity(removal, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/insufficient liquidity burned/i);
      });
  
      it('should revert when pool has insufficient liquidity', async () => {
        const baseQuantity = '0.00000001';
        const quoteQuantity = '1000000.00000000';
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          baseQuantity,
          quoteQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        const totalLiquidity = (await pair.totalSupply()).toString();
  
        await addLiquidityAndExecute(
          quoteQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
          false,
          18,
          decimalToAssetUnits(quoteQuantity, 18),
          decimalToAssetUnits(baseQuantity, 18),
          totalLiquidity,
        );
  
        const { removal, execution } = await generateOffChainLiquidityRemoval(
          '1',
          ownerWallet,
          exchange,
          pair,
          token0,
          token1,
          true,
        );
        const signature = await getSignature(
          web3,
          getLiquidityRemovalHash(removal),
          ownerWallet,
        );
  
        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executeRemoveLiquidity as any)(
            ...getRemoveLiquidityArguments(removal, signature, execution),
            { from: ownerWallet },
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/insufficient liquidity/i);
      });
  
      it('should revert on invalid amountA', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOnChainLiquidityRemoval(
          exchange,
          pair,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.amountA = decimalToAssetUnits('0.50000000', 18);
  
        let error;
        try {
          await exchange.executeRemoveLiquidity(removal, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid amountA/i);
      });
  
      it('should revert on invalid amountB', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOnChainLiquidityRemoval(
          exchange,
          pair,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.amountB = decimalToAssetUnits('0.50000000', 18);
  
        let error;
        try {
          await exchange.executeRemoveLiquidity(removal, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid amountB/i);
      });
  
      it('should revert on excessive A fee', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOnChainLiquidityRemoval(
          exchange,
          pair,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.feeAmountA = decimalToAssetUnits('0.50000000', 18);
  
        let error;
        try {
          await exchange.executeRemoveLiquidity(removal, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/excessive A fee/i);
      });
  
      it('should revert on excessive B fee', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOnChainLiquidityRemoval(
          exchange,
          pair,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.feeAmountB = decimalToAssetUnits('0.50000000', 18);
  
        let error;
        try {
          await exchange.executeRemoveLiquidity(removal, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/excessive B fee/i);
      });
  
      it('should revert on invalid liquidity amount', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOnChainLiquidityRemoval(
          exchange,
          pair,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.liquidity = decimalToAssetUnits('0.50000000', 18);
  
        let error;
        try {
          await exchange.executeRemoveLiquidity(removal, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid liquidity burned/i);
      });
  
      it('should revert on invalid base amount', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOnChainLiquidityRemoval(
          exchange,
          pair,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.amountA = decimalToAssetUnits('1.10000000', 18);
  
        let error;
        try {
          await exchange.executeRemoveLiquidity(removal, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid base amount/i);
      });
  
      it('should revert on invalid quote amount', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOnChainLiquidityRemoval(
          exchange,
          pair,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        execution.amountB = decimalToAssetUnits('1.10000000', 18);
  
        let error;
        try {
          await exchange.executeRemoveLiquidity(removal, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid quote amount/i);
      });
  
      it('should revert for invalid signatureHashVersion', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
  
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
  
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );
  
        const { removal, execution } = await generateOnChainLiquidityRemoval(
          exchange,
          pair,
          depositQuantityInAssetUnits,
          ownerWallet,
          token0,
          token1,
        );
        removal.signatureHashVersion = 88;
  
        let error;
        try {
          await exchange.executeRemoveLiquidity(removal, execution);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/signature hash version invalid/i);
      });
    });
  
    describe('removeLiquidityExit', () => {
      it('should work', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
        const {
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token,
        );
  
        await pair.approve(exchange.address, depositQuantityInAssetUnits, {
          from: ownerWallet,
        });
        await exchange.depositTokenByAddress(
          pair.address,
          depositQuantityInAssetUnits,
        );
  
        await exchange.exitWallet();
  
        await exchange.removeLiquidityExit(token.address, ethAddress);
  
        const burnEvents = await pair.getPastEvents('Burn', {
          fromBlock: 0,
        });
        expect(burnEvents).to.be.an('array');
        expect(burnEvents.length).to.equal(1);
        expect(burnEvents[0].returnValues.amount0).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(burnEvents[0].returnValues.amount1).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
  
      it('should revert when wallet exit not finalized', async () => {
        const depositQuantity = '1.00000000';
        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
  
        let error;
        try {
          await exchange.removeLiquidityExit(token.address, ethAddress);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/wallet exit not finalized/i);
      });
    });
  
    // TODO Move to exchange.test.ts
    describe('skim', () => {
      it('should work', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';
  
        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setFeeWallet(ownerWallet);
  
        await token.transfer(
          exchange.address,
          decimalToAssetUnits('5000.00000000', 18),
        );
  
        await exchange.skim(token.address);
  
        const tokenEvents = await token.getPastEvents('Transfer', {
          fromBlock: 0,
        });
        expect(tokenEvents).to.be.an('array');
        expect(tokenEvents).to.be.an('array');
        expect(tokenEvents.length).to.equal(6);
        expect(tokenEvents[5].returnValues.value).to.equal(
          decimalToAssetUnits('5000.00000000', 18),
        );
        expect(tokenEvents[5].returnValues.to).to.equal(ownerWallet);
      });
  
      it('should revert for invalid token address', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';
  
        const { exchange } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
  
        let error;
        try {
          await exchange.skim(ethAddress);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid token address/i);
      });
    });
    */
});
function deployContractsAndCreateHybridPool(initialBaseReserve, initialQuoteReserve, ownerWallet, feeWallet) {
    if (feeWallet === void 0) { feeWallet = ownerWallet; }
    return __awaiter(this, void 0, void 0, function () {
        var _a, custodian, exchange, token0, token1, _b, factory, pair, pairSymbol;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                case 1:
                    _a = _c.sent(), custodian = _a.custodian, exchange = _a.exchange;
                    return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, token0Symbol)];
                case 2:
                    token0 = _c.sent();
                    return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, token0Symbol)];
                case 3:
                    token1 = _c.sent();
                    return [4 /*yield*/, deployPancakeCoreAndCreatePool(ownerWallet, custodian, token0, token1, feeWallet)];
                case 4:
                    _b = _c.sent(), factory = _b.factory, pair = _b.pair;
                    return [4 /*yield*/, exchange.setPairFactoryAddress(factory.address)];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, pair.symbol()];
                case 6:
                    pairSymbol = _c.sent();
                    return [4 /*yield*/, exchange.registerToken(pair.address, pairSymbol, 18)];
                case 7:
                    _c.sent();
                    return [4 /*yield*/, exchange.confirmTokenRegistration(pair.address, pairSymbol, 18)];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, token0.transfer(pair.address, lib_1.decimalToAssetUnits(initialQuoteReserve, 18), {
                            from: ownerWallet
                        })];
                case 9:
                    _c.sent();
                    return [4 /*yield*/, token1.transfer(pair.address, lib_1.decimalToAssetUnits(initialBaseReserve, 18), {
                            from: ownerWallet
                        })];
                case 10:
                    _c.sent();
                    return [4 /*yield*/, pair.mint(ownerWallet)];
                case 11:
                    _c.sent();
                    return [4 /*yield*/, exchange.promotePool(token0.address, token1.address, pair.address)];
                case 12:
                    _c.sent();
                    return [2 /*return*/, { custodian: custodian, exchange: exchange, pair: pair, token0: token0, token1: token1 }];
            }
        });
    });
}
exports.deployContractsAndCreateHybridPool = deployContractsAndCreateHybridPool;
function deployContractsAndCreateHybridETHPool(initialBaseReserve, initialQuoteReserve, ownerWallet, feeWallet) {
    if (feeWallet === void 0) { feeWallet = ownerWallet; }
    return __awaiter(this, void 0, void 0, function () {
        var _a, custodian, exchange, farm, weth, token, _b, factory, pair, Migrator, migrator, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, helpers_1.deployAndAssociateContracts()];
                case 1:
                    _a = _g.sent(), custodian = _a.custodian, exchange = _a.exchange, farm = _a.farm, weth = _a.weth;
                    return [4 /*yield*/, helpers_1.deployAndRegisterToken(exchange, token0Symbol)];
                case 2:
                    token = _g.sent();
                    return [4 /*yield*/, deployPancakeCoreAndCreateETHPool(ownerWallet, custodian, token, weth, feeWallet)];
                case 3:
                    _b = _g.sent(), factory = _b.factory, pair = _b.pair;
                    /*
                    const pairSymbol = await pair.symbol();
                    await exchange.registerToken(pair.address, pairSymbol, 18);
                    await exchange.confirmTokenRegistration(pair.address, pairSymbol, 18);
                    */
                    return [4 /*yield*/, weth.deposit({
                            value: lib_1.decimalToAssetUnits(initialQuoteReserve, 18),
                            from: ownerWallet
                        })];
                case 4:
                    /*
                    const pairSymbol = await pair.symbol();
                    await exchange.registerToken(pair.address, pairSymbol, 18);
                    await exchange.confirmTokenRegistration(pair.address, pairSymbol, 18);
                    */
                    _g.sent();
                    return [4 /*yield*/, weth.transfer(pair.address, lib_1.decimalToAssetUnits(initialQuoteReserve, 18), {
                            from: ownerWallet
                        })];
                case 5:
                    _g.sent();
                    return [4 /*yield*/, token.transfer(pair.address, lib_1.decimalToAssetUnits(initialBaseReserve, 18), {
                            from: ownerWallet
                        })];
                case 6:
                    _g.sent();
                    return [4 /*yield*/, pair.mint(ownerWallet)];
                case 7:
                    _g.sent();
                    Migrator = artifacts.require('Migrator');
                    return [4 /*yield*/, Migrator["new"](farm.address, factory.address, exchange.address, 0)];
                case 8:
                    migrator = _g.sent();
                    return [4 /*yield*/, farm.setMigrator(migrator.address)];
                case 9:
                    _g.sent();
                    _d = (_c = farm).migrate;
                    _e = [0];
                    _f = weth.address;
                    return [4 /*yield*/, pair.token0()];
                case 10: return [4 /*yield*/, _d.apply(_c, _e.concat([_f === (_g.sent()) ? 0 : 1]))];
                case 11:
                    _g.sent();
                    return [2 /*return*/, { custodian: custodian, exchange: exchange, pair: pair, token: token, weth: weth }];
            }
        });
    });
}
exports.deployContractsAndCreateHybridETHPool = deployContractsAndCreateHybridETHPool;
function deployPancakeCoreAndCreatePool(ownerWallet, custodian, token0, token1, feeWallet) {
    if (feeWallet === void 0) { feeWallet = ownerWallet; }
    return __awaiter(this, void 0, void 0, function () {
        var Factory, IIDEXPair, factory, pairAddress, pair;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    Factory = artifacts.require('Factory');
                    IIDEXPair = artifacts.require('IIDEXPair');
                    return [4 /*yield*/, Factory["new"](feeWallet, custodian.address)];
                case 1:
                    factory = _a.sent();
                    return [4 /*yield*/, factory.createPair(token0.address, token1.address)];
                case 2:
                    pairAddress = (_a.sent())
                        .logs[0].args.pair;
                    return [4 /*yield*/, IIDEXPair.at(pairAddress)];
                case 3:
                    pair = _a.sent();
                    return [2 /*return*/, { factory: factory, pair: pair }];
            }
        });
    });
}
exports.deployPancakeCoreAndCreatePool = deployPancakeCoreAndCreatePool;
function deployPancakeCoreAndCreateETHPool(ownerWallet, custodian, token, weth, feeWallet) {
    if (feeWallet === void 0) { feeWallet = ownerWallet; }
    return __awaiter(this, void 0, void 0, function () {
        var Factory, IIDEXPair, factory, tx, pairAddress, pair;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    Factory = artifacts.require('Factory');
                    IIDEXPair = artifacts.require('IIDEXPair');
                    return [4 /*yield*/, Factory["new"](feeWallet, custodian.address)];
                case 1:
                    factory = _a.sent();
                    return [4 /*yield*/, factory.createPair(token.address, weth.address)];
                case 2:
                    tx = _a.sent();
                    pairAddress = tx.logs[0].args.pair;
                    return [4 /*yield*/, IIDEXPair.at(pairAddress)];
                case 3:
                    pair = _a.sent();
                    return [2 /*return*/, { factory: factory, pair: pair }];
            }
        });
    });
}
exports.deployPancakeCoreAndCreateETHPool = deployPancakeCoreAndCreateETHPool;
function addLiquidityAndExecute(depositQuantity, ownerWallet, exchange, token0, token1, includeFee, decimals, token0Override, token1Override, liquidityOverride) {
    if (includeFee === void 0) { includeFee = false; }
    if (decimals === void 0) { decimals = 18; }
    return __awaiter(this, void 0, void 0, function () {
        var depositQuantityInAssetUnits, amountA, amountB, deadline, feeAmount, liquidity, execution;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    depositQuantityInAssetUnits = lib_1.decimalToAssetUnits(depositQuantity, decimals);
                    amountA = token0Override || depositQuantityInAssetUnits;
                    amountB = token1Override || depositQuantityInAssetUnits;
                    return [4 /*yield*/, token0.approve(exchange.address, amountA, {
                            from: ownerWallet
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, token1.approve(exchange.address, amountB, {
                            from: ownerWallet
                        })];
                case 2:
                    _a.sent();
                    deadline = Date.now() + 10000;
                    return [4 /*yield*/, exchange.addLiquidity(token0.address, token1.address, amountA, amountB, amountA, amountB, ownerWallet, deadline)];
                case 3:
                    _a.sent();
                    feeAmount = includeFee
                        ? new bignumber_js_1["default"](amountA).multipliedBy(new bignumber_js_1["default"]('0.02')).toFixed(0)
                        : '0';
                    liquidity = liquidityOverride ||
                        new bignumber_js_1["default"](amountB).minus(new bignumber_js_1["default"](feeAmount)).toFixed(0);
                    execution = {
                        liquidity: liquidity,
                        amountA: amountA,
                        amountB: amountB,
                        feeAmountA: feeAmount,
                        feeAmountB: feeAmount,
                        baseAssetAddress: token0.address,
                        quoteAssetAddress: token1.address
                    };
                    return [4 /*yield*/, exchange.executeAddLiquidity({
                            signatureHashVersion: 2,
                            origination: 0,
                            nonce: 0,
                            wallet: ownerWallet,
                            assetA: token0.address,
                            assetB: token1.address,
                            amountADesired: amountA,
                            amountBDesired: amountB,
                            amountAMin: amountA,
                            amountBMin: amountB,
                            to: ownerWallet,
                            deadline: deadline,
                            signature: '0x'
                        }, execution, { from: ownerWallet })];
                case 4:
                    _a.sent();
                    return [2 /*return*/, { execution: execution }];
            }
        });
    });
}
function addLiquidityETHAndExecute(depositQuantity, ownerWallet, exchange, token, includeFee, to, decimals) {
    if (includeFee === void 0) { includeFee = false; }
    if (to === void 0) { to = ownerWallet; }
    if (decimals === void 0) { decimals = 18; }
    return __awaiter(this, void 0, void 0, function () {
        var depositQuantityInAssetUnits, deadline, feeAmount, liquidity, execution;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    depositQuantityInAssetUnits = lib_1.decimalToAssetUnits(depositQuantity, decimals);
                    return [4 /*yield*/, token.approve(exchange.address, depositQuantityInAssetUnits, {
                            from: ownerWallet
                        })];
                case 1:
                    _a.sent();
                    deadline = Date.now() + 10000;
                    return [4 /*yield*/, exchange.addLiquidityETH(token.address, depositQuantityInAssetUnits, depositQuantityInAssetUnits, depositQuantityInAssetUnits, to, deadline, { value: depositQuantityInAssetUnits })];
                case 2:
                    _a.sent();
                    feeAmount = includeFee
                        ? new bignumber_js_1["default"](depositQuantityInAssetUnits)
                            .multipliedBy(new bignumber_js_1["default"]('0.02'))
                            .toFixed(0)
                        : '0';
                    liquidity = new bignumber_js_1["default"](depositQuantityInAssetUnits)
                        .minus(new bignumber_js_1["default"](feeAmount))
                        .toFixed(0);
                    execution = {
                        liquidity: liquidity,
                        amountA: depositQuantityInAssetUnits,
                        amountB: depositQuantityInAssetUnits,
                        feeAmountA: feeAmount,
                        feeAmountB: feeAmount,
                        baseAssetAddress: token.address,
                        quoteAssetAddress: lib_1.ethAddress
                    };
                    return [4 /*yield*/, exchange.executeAddLiquidity({
                            signatureHashVersion: 2,
                            origination: 0,
                            nonce: 0,
                            wallet: ownerWallet,
                            assetA: token.address,
                            assetB: lib_1.ethAddress,
                            amountADesired: depositQuantityInAssetUnits,
                            amountBDesired: depositQuantityInAssetUnits,
                            amountAMin: depositQuantityInAssetUnits,
                            amountBMin: depositQuantityInAssetUnits,
                            to: to,
                            deadline: deadline,
                            signature: '0x'
                        }, execution, { from: ownerWallet })];
                case 3:
                    _a.sent();
                    return [2 /*return*/, { execution: execution }];
            }
        });
    });
}
function removeLiquidityAndExecute(depositQuantity, ownerWallet, exchange, pair, token0, token1, includeFee, to, decimals) {
    if (includeFee === void 0) { includeFee = false; }
    if (to === void 0) { to = ownerWallet; }
    if (decimals === void 0) { decimals = 18; }
    return __awaiter(this, void 0, void 0, function () {
        var depositQuantityInAssetUnits, deadline, feeAmount, execution;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    depositQuantityInAssetUnits = lib_1.decimalToAssetUnits(depositQuantity, decimals);
                    return [4 /*yield*/, pair.approve(exchange.address, depositQuantityInAssetUnits, {
                            from: ownerWallet
                        })];
                case 1:
                    _a.sent();
                    deadline = Date.now() + 10000;
                    return [4 /*yield*/, exchange.removeLiquidity(token0.address, token1.address, depositQuantityInAssetUnits, depositQuantityInAssetUnits, depositQuantityInAssetUnits, to, deadline)];
                case 2:
                    _a.sent();
                    feeAmount = includeFee
                        ? new bignumber_js_1["default"](depositQuantityInAssetUnits)
                            .multipliedBy(new bignumber_js_1["default"]('0.02'))
                            .toFixed(0)
                        : '0';
                    execution = {
                        liquidity: depositQuantityInAssetUnits,
                        amountA: depositQuantityInAssetUnits,
                        amountB: depositQuantityInAssetUnits,
                        feeAmountA: feeAmount,
                        feeAmountB: feeAmount,
                        baseAssetAddress: token0.address,
                        quoteAssetAddress: token1.address
                    };
                    return [4 /*yield*/, exchange.executeRemoveLiquidity({
                            signatureHashVersion: 2,
                            origination: 0,
                            nonce: 0,
                            wallet: ownerWallet,
                            assetA: token0.address,
                            assetB: token1.address,
                            liquidity: depositQuantityInAssetUnits,
                            amountAMin: depositQuantityInAssetUnits,
                            amountBMin: depositQuantityInAssetUnits,
                            to: to,
                            deadline: deadline,
                            signature: '0x'
                        }, execution, { from: ownerWallet })];
                case 3:
                    _a.sent();
                    return [2 /*return*/, { execution: execution }];
            }
        });
    });
}
function removeLiquidityETHAndExecute(depositQuantity, ownerWallet, exchange, pair, token, includeFee, decimals) {
    if (includeFee === void 0) { includeFee = false; }
    if (decimals === void 0) { decimals = 18; }
    return __awaiter(this, void 0, void 0, function () {
        var depositQuantityInAssetUnits, deadline, feeAmount, execution;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    depositQuantityInAssetUnits = lib_1.decimalToAssetUnits(depositQuantity, decimals);
                    return [4 /*yield*/, pair.approve(exchange.address, depositQuantityInAssetUnits, {
                            from: ownerWallet
                        })];
                case 1:
                    _a.sent();
                    deadline = Date.now() + 10000;
                    return [4 /*yield*/, exchange.removeLiquidityETH(token.address, depositQuantityInAssetUnits, depositQuantityInAssetUnits, depositQuantityInAssetUnits, ownerWallet, deadline)];
                case 2:
                    _a.sent();
                    feeAmount = includeFee
                        ? new bignumber_js_1["default"](depositQuantityInAssetUnits)
                            .multipliedBy(new bignumber_js_1["default"]('0.02'))
                            .toFixed(0)
                        : '0';
                    execution = {
                        liquidity: depositQuantityInAssetUnits,
                        amountA: depositQuantityInAssetUnits,
                        amountB: depositQuantityInAssetUnits,
                        feeAmountA: feeAmount,
                        feeAmountB: feeAmount,
                        baseAssetAddress: token.address,
                        quoteAssetAddress: lib_1.ethAddress
                    };
                    return [4 /*yield*/, exchange.executeRemoveLiquidity({
                            signatureHashVersion: 2,
                            origination: 0,
                            nonce: 0,
                            wallet: ownerWallet,
                            assetA: token.address,
                            assetB: lib_1.ethAddress,
                            liquidity: depositQuantityInAssetUnits,
                            amountAMin: depositQuantityInAssetUnits,
                            amountBMin: depositQuantityInAssetUnits,
                            to: ownerWallet,
                            deadline: deadline,
                            signature: '0x'
                        }, execution, { from: ownerWallet })];
                case 3:
                    _a.sent();
                    return [2 /*return*/, { execution: execution }];
            }
        });
    });
}
function generateOnChainLiquidityAddition(exchange, depositQuantityInAssetUnits, ownerWallet, token0, token1) {
    return __awaiter(this, void 0, void 0, function () {
        var deadline, addition, execution;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    deadline = Date.now() + 10000;
                    return [4 /*yield*/, token0.approve(exchange.address, depositQuantityInAssetUnits)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, token1.approve(exchange.address, depositQuantityInAssetUnits)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, exchange.addLiquidity(token0.address, token1.address, depositQuantityInAssetUnits, depositQuantityInAssetUnits, depositQuantityInAssetUnits, depositQuantityInAssetUnits, ownerWallet, deadline)];
                case 3:
                    _a.sent();
                    addition = {
                        signatureHashVersion: 2,
                        origination: 0,
                        nonce: 0,
                        wallet: ownerWallet,
                        assetA: token0.address,
                        assetB: token1.address,
                        amountADesired: depositQuantityInAssetUnits,
                        amountBDesired: depositQuantityInAssetUnits,
                        amountAMin: depositQuantityInAssetUnits,
                        amountBMin: depositQuantityInAssetUnits,
                        to: ownerWallet,
                        deadline: deadline,
                        signature: '0x'
                    };
                    execution = {
                        liquidity: depositQuantityInAssetUnits,
                        amountA: depositQuantityInAssetUnits,
                        amountB: depositQuantityInAssetUnits,
                        feeAmountA: 0,
                        feeAmountB: 0,
                        baseAssetAddress: token0.address,
                        quoteAssetAddress: token1.address
                    };
                    return [2 /*return*/, { addition: addition, execution: execution }];
            }
        });
    });
}
function generateOnChainLiquidityRemoval(exchange, pair, depositQuantityInAssetUnits, ownerWallet, token0, token1) {
    return __awaiter(this, void 0, void 0, function () {
        var deadline, removal, execution;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    deadline = Date.now() + 10000;
                    return [4 /*yield*/, pair.approve(exchange.address, depositQuantityInAssetUnits, {
                            from: ownerWallet
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, exchange.removeLiquidity(token0.address, token1.address, depositQuantityInAssetUnits, depositQuantityInAssetUnits, depositQuantityInAssetUnits, ownerWallet, deadline)];
                case 2:
                    _a.sent();
                    removal = {
                        signatureHashVersion: 2,
                        origination: 0,
                        nonce: 0,
                        wallet: ownerWallet,
                        assetA: token0.address,
                        assetB: token1.address,
                        liquidity: depositQuantityInAssetUnits,
                        amountAMin: depositQuantityInAssetUnits,
                        amountBMin: depositQuantityInAssetUnits,
                        to: ownerWallet,
                        deadline: deadline,
                        signature: '0x'
                    };
                    execution = {
                        liquidity: depositQuantityInAssetUnits,
                        amountA: depositQuantityInAssetUnits,
                        amountB: depositQuantityInAssetUnits,
                        feeAmountA: 0,
                        feeAmountB: 0,
                        baseAssetAddress: token0.address,
                        quoteAssetAddress: token1.address
                    };
                    return [2 /*return*/, { removal: removal, execution: execution }];
            }
        });
    });
}
function generateOffChainLiquidityAddition(depositQuantityInAssetUnits, ownerWallet, exchange, token0, token1) {
    return __awaiter(this, void 0, void 0, function () {
        var addition, execution;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, token0.approve(exchange.address, depositQuantityInAssetUnits)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, token1.approve(exchange.address, depositQuantityInAssetUnits)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, exchange.depositTokenByAddress(token0.address, depositQuantityInAssetUnits)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, exchange.depositTokenByAddress(token1.address, depositQuantityInAssetUnits)];
                case 4:
                    _a.sent();
                    addition = {
                        signatureHashVersion: lib_1.signatureHashVersion,
                        nonce: uuid_1.v1(),
                        wallet: ownerWallet,
                        assetA: token0.address,
                        assetB: token1.address,
                        amountADesired: depositQuantityInAssetUnits,
                        amountBDesired: depositQuantityInAssetUnits,
                        amountAMin: depositQuantityInAssetUnits,
                        amountBMin: depositQuantityInAssetUnits,
                        to: ownerWallet,
                        deadline: 0
                    };
                    execution = {
                        liquidity: depositQuantityInAssetUnits,
                        amountA: depositQuantityInAssetUnits,
                        amountB: depositQuantityInAssetUnits,
                        feeAmountA: 0,
                        feeAmountB: 0,
                        baseAssetAddress: token0.address,
                        quoteAssetAddress: token1.address
                    };
                    return [2 /*return*/, { addition: addition, execution: execution }];
            }
        });
    });
}
function generateOffChainLiquidityRemoval(depositQuantityInAssetUnits, ownerWallet, exchange, pair, token0, token1, skipPairTokenDeposit) {
    if (skipPairTokenDeposit === void 0) { skipPairTokenDeposit = false; }
    return __awaiter(this, void 0, void 0, function () {
        var removal, execution;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!skipPairTokenDeposit) return [3 /*break*/, 3];
                    return [4 /*yield*/, pair.approve(exchange.address, depositQuantityInAssetUnits, {
                            from: ownerWallet
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, exchange.depositTokenByAddress(pair.address, depositQuantityInAssetUnits)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    removal = {
                        signatureHashVersion: lib_1.signatureHashVersion,
                        nonce: uuid_1.v1(),
                        wallet: ownerWallet,
                        assetA: token0.address,
                        assetB: token1.address,
                        liquidity: depositQuantityInAssetUnits,
                        amountAMin: depositQuantityInAssetUnits,
                        amountBMin: depositQuantityInAssetUnits,
                        to: ownerWallet,
                        deadline: 0
                    };
                    execution = {
                        liquidity: depositQuantityInAssetUnits,
                        amountA: depositQuantityInAssetUnits,
                        amountB: depositQuantityInAssetUnits,
                        feeAmountA: 0,
                        feeAmountB: 0,
                        baseAssetAddress: token0.address,
                        quoteAssetAddress: token1.address
                    };
                    return [2 /*return*/, { removal: removal, execution: execution }];
            }
        });
    });
}
