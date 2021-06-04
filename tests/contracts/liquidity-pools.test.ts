import BigNumber from 'bignumber.js';
import { v1 as uuidv1 } from 'uuid';

import {
  bnbAddress,
  decimalToAssetUnits,
  decimalToPips,
  getAddLiquidityArguments,
  getLiquidityAdditionHash,
  getLiquidityRemovalHash,
  getRemoveLiquidityArguments,
  LiquidityAddition,
  LiquidityRemoval,
  signatureHashVersion,
} from '../../lib';
import {
  CustodianInstance,
  ExchangeInstance,
  IIDEXPairInstance,
  FactoryInstance,
  TestTokenInstance,
  WETHInstance,
} from '../../types/truffle-contracts';
import {
  deployAndAssociateContracts,
  deployAndRegisterToken,
  getSignature,
} from './helpers';

const token0Symbol = 'DIL';

contract('Exchange (liquidity pools)', ([ownerWallet]) => {
  describe('promotePool', () => {
    it('should work', async () => {
      const depositQuantity = '1.00000000';
      const {
        custodian,
        exchange,
        token,
        wbnb,
      } = await deployContractsAndCreateHybridETHPool(
        depositQuantity,
        depositQuantity,
        ownerWallet,
      );

      const tokenEvents = await token.getPastEvents('Transfer', {
        fromBlock: 0,
      });
      expect(tokenEvents).to.be.an('array');
      expect(tokenEvents.length).to.equal(4);
      expect(tokenEvents[2].returnValues.value).to.equal(
        decimalToAssetUnits(depositQuantity, 18),
      );
      expect(tokenEvents[2].returnValues.to).to.equal(exchange.address);
      expect(tokenEvents[3].returnValues.value).to.equal(
        decimalToAssetUnits(depositQuantity, 18),
      );
      expect(tokenEvents[3].returnValues.to).to.equal(custodian.address);

      const wbnbEvents = await wbnb.getPastEvents('Transfer', {
        fromBlock: 0,
      });
      expect(wbnbEvents).to.be.an('array');
      expect(wbnbEvents.length).to.equal(2);
      expect(wbnbEvents[1].returnValues.wad).to.equal(
        decimalToAssetUnits(depositQuantity, 18),
      );
      expect(wbnbEvents[1].returnValues.dst).to.equal(exchange.address);

      const pool = await exchange.loadLiquidityPoolByAssetAddresses(
        token.address,
        bnbAddress,
      );
      expect(pool.baseAssetReserveInPips).to.equal(
        decimalToPips(depositQuantity),
      );
      expect(pool.quoteAssetReserveInPips).to.equal(
        decimalToPips(depositQuantity),
      );
    });

    it('should fail when no liquidity has been minted', async () => {
      const { custodian, exchange, wbnb } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, token0Symbol);
      const { factory, pair } = await deployPancakeCoreAndCreateETHPool(
        ownerWallet,
        custodian,
        token,
        wbnb,
        ownerWallet,
      );
      await exchange.setPairFactoryAddress(factory.address);

      let error;
      try {
        await exchange.promotePool(token.address, bnbAddress, pair.address);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/no liquidity minted/i);
    });

    it('should fail when pair address does not match factory', async () => {
      const { custodian, exchange, wbnb } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, token0Symbol);
      const { factory } = await deployPancakeCoreAndCreateETHPool(
        ownerWallet,
        custodian,
        token,
        wbnb,
        ownerWallet,
      );
      await exchange.setPairFactoryAddress(factory.address);

      let error;
      try {
        await exchange.promotePool(token.address, bnbAddress, wbnb.address);
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
        await exchange.promotePool(token.address, bnbAddress, pair.address);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/pool already exists/i);
    });
  });

  describe('demotePool', () => {
    it('should work', async () => {
      const depositQuantity = '1.00000000';
      const { exchange, token } = await deployContractsAndCreateHybridETHPool(
        depositQuantity,
        depositQuantity,
        ownerWallet,
      );

      await exchange.demotePool(token.address, bnbAddress);

      let error;
      try {
        await exchange.loadLiquidityPoolByAssetAddresses(
          token.address,
          bnbAddress,
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

      await exchange.removeLiquidityExit(token.address, bnbAddress);

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
        await exchange.removeLiquidityExit(token.address, bnbAddress);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/wallet exit not finalized/i);
    });
  });

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
  });
});

export async function deployContractsAndCreateHybridPool(
  initialBaseReserve: string,
  initialQuoteReserve: string,
  ownerWallet: string,
  feeWallet = ownerWallet,
): Promise<{
  custodian: CustodianInstance;
  exchange: ExchangeInstance;
  pair: IIDEXPairInstance;
  token0: TestTokenInstance;
  token1: TestTokenInstance;
}> {
  const { custodian, exchange, wbnb } = await deployAndAssociateContracts();
  const token0 = await deployAndRegisterToken(exchange, token0Symbol);
  const token1 = await deployAndRegisterToken(exchange, token0Symbol);
  const { factory, pair } = await deployPancakeCoreAndCreatePool(
    ownerWallet,
    custodian,
    token0,
    token1,
    feeWallet,
  );
  await exchange.setPairFactoryAddress(factory.address);

  const pairSymbol = await pair.symbol();
  await exchange.registerToken(pair.address, pairSymbol, 18);
  await exchange.confirmTokenRegistration(pair.address, pairSymbol, 18);

  await wbnb.deposit({
    value: decimalToAssetUnits(initialQuoteReserve, 18),
    from: ownerWallet,
  });
  await token0.transfer(
    pair.address,
    decimalToAssetUnits(initialQuoteReserve, 18),
    {
      from: ownerWallet,
    },
  );
  await token1.transfer(
    pair.address,
    decimalToAssetUnits(initialBaseReserve, 18),
    {
      from: ownerWallet,
    },
  );
  await pair.mint(ownerWallet);

  await exchange.promotePool(token0.address, token1.address, pair.address);

  return { custodian, exchange, pair, token0, token1 };
}

export async function deployContractsAndCreateHybridETHPool(
  initialBaseReserve: string,
  initialQuoteReserve: string,
  ownerWallet: string,
  feeWallet = ownerWallet,
): Promise<{
  custodian: CustodianInstance;
  exchange: ExchangeInstance;
  pair: IIDEXPairInstance;
  token: TestTokenInstance;
  wbnb: WETHInstance;
}> {
  const { custodian, exchange, wbnb } = await deployAndAssociateContracts();
  const token = await deployAndRegisterToken(exchange, token0Symbol);
  const { factory, pair } = await deployPancakeCoreAndCreateETHPool(
    ownerWallet,
    custodian,
    token,
    wbnb,
    feeWallet,
  );
  await exchange.setPairFactoryAddress(factory.address);

  const pairSymbol = await pair.symbol();
  await exchange.registerToken(pair.address, pairSymbol, 18);
  await exchange.confirmTokenRegistration(pair.address, pairSymbol, 18);

  await wbnb.deposit({
    value: decimalToAssetUnits(initialQuoteReserve, 18),
    from: ownerWallet,
  });
  await wbnb.transfer(
    pair.address,
    decimalToAssetUnits(initialQuoteReserve, 18),
    {
      from: ownerWallet,
    },
  );
  await token.transfer(
    pair.address,
    decimalToAssetUnits(initialBaseReserve, 18),
    {
      from: ownerWallet,
    },
  );
  await pair.mint(ownerWallet);

  await exchange.promotePool(token.address, bnbAddress, pair.address);

  return { custodian, exchange, pair, token, wbnb };
}

export async function deployPancakeCoreAndCreatePool(
  ownerWallet: string,
  custodian: CustodianInstance,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
  feeWallet = ownerWallet,
): Promise<{
  factory: FactoryInstance;
  pair: IIDEXPairInstance;
}> {
  const Factory = artifacts.require('Factory');
  const IIDEXPair = artifacts.require('IIDEXPair');
  const factory = await Factory.new(feeWallet, custodian.address);

  const pairAddress = (await factory.createPair(token0.address, token1.address))
    .logs[0].args.pair;
  const pair = await IIDEXPair.at(pairAddress);

  return { factory, pair };
}

export async function deployPancakeCoreAndCreateETHPool(
  ownerWallet: string,
  custodian: CustodianInstance,
  token: TestTokenInstance,
  wbnb: WETHInstance,
  feeWallet = ownerWallet,
): Promise<{
  factory: FactoryInstance;
  pair: IIDEXPairInstance;
}> {
  const Factory = artifacts.require('Factory');
  const IIDEXPair = artifacts.require('IIDEXPair');
  const factory = await Factory.new(feeWallet, custodian.address);

  const tx = await factory.createPair(token.address, wbnb.address);
  const pairAddress = tx.logs[0].args.pair;
  const pair = await IIDEXPair.at(pairAddress);

  return { factory, pair };
}

async function addLiquidityAndExecute(
  depositQuantity: string,
  ownerWallet: string,
  exchange: ExchangeInstance,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
  includeFee = false,
  decimals = 18,
): Promise<{
  execution: ExchangeInstance['executeAddLiquidity']['arguments'][1];
}> {
  const depositQuantityInAssetUnits = decimalToAssetUnits(
    depositQuantity,
    decimals,
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

  const feeAmount = includeFee
    ? new BigNumber(depositQuantityInAssetUnits)
        .multipliedBy(new BigNumber('0.02'))
        .toFixed(0)
    : '0';
  const liquidity = new BigNumber(depositQuantityInAssetUnits)
    .minus(new BigNumber(feeAmount))
    .toFixed(0);
  const execution = {
    liquidity,
    amountA: depositQuantityInAssetUnits,
    amountB: depositQuantityInAssetUnits,
    feeAmountA: feeAmount,
    feeAmountB: feeAmount,
    baseAssetAddress: token0.address,
    quoteAssetAddress: token1.address,
  };

  await exchange.executeAddLiquidity(
    {
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
      deadline,
      signature: '0x',
    },
    execution,
    { from: ownerWallet },
  );

  return { execution };
}

async function addLiquidityETHAndExecute(
  depositQuantity: string,
  ownerWallet: string,
  exchange: ExchangeInstance,
  token: TestTokenInstance,
  includeFee = false,
  to = ownerWallet,
  decimals = 18,
): Promise<{
  execution: ExchangeInstance['executeAddLiquidity']['arguments'][1];
}> {
  const depositQuantityInAssetUnits = decimalToAssetUnits(
    depositQuantity,
    decimals,
  );

  await token.approve(exchange.address, depositQuantityInAssetUnits, {
    from: ownerWallet,
  });

  const deadline = Date.now() + 10000;
  await exchange.addLiquidityETH(
    token.address,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    to,
    deadline,
    { value: depositQuantityInAssetUnits },
  );

  const feeAmount = includeFee
    ? new BigNumber(depositQuantityInAssetUnits)
        .multipliedBy(new BigNumber('0.02'))
        .toFixed(0)
    : '0';
  const liquidity = new BigNumber(depositQuantityInAssetUnits)
    .minus(new BigNumber(feeAmount))
    .toFixed(0);
  const execution = {
    liquidity,
    amountA: depositQuantityInAssetUnits,
    amountB: depositQuantityInAssetUnits,
    feeAmountA: feeAmount,
    feeAmountB: feeAmount,
    baseAssetAddress: token.address,
    quoteAssetAddress: bnbAddress,
  };

  await exchange.executeAddLiquidity(
    {
      signatureHashVersion: 2,
      origination: 0,
      nonce: 0,
      wallet: ownerWallet,
      assetA: token.address,
      assetB: bnbAddress,
      amountADesired: depositQuantityInAssetUnits,
      amountBDesired: depositQuantityInAssetUnits,
      amountAMin: depositQuantityInAssetUnits,
      amountBMin: depositQuantityInAssetUnits,
      to,
      deadline,
      signature: '0x',
    },
    execution,
    { from: ownerWallet },
  );

  return { execution };
}

async function removeLiquidityAndExecute(
  depositQuantity: string,
  ownerWallet: string,
  exchange: ExchangeInstance,
  pair: IIDEXPairInstance,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
  includeFee = false,
  to = ownerWallet,
  decimals = 18,
): Promise<{
  execution: ExchangeInstance['executeRemoveLiquidity']['arguments'][1];
}> {
  const depositQuantityInAssetUnits = decimalToAssetUnits(
    depositQuantity,
    decimals,
  );

  await pair.approve(exchange.address, depositQuantityInAssetUnits, {
    from: ownerWallet,
  });
  const deadline = Date.now() + 10000;
  await exchange.removeLiquidity(
    token0.address,
    token1.address,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    to,
    deadline,
  );

  const feeAmount = includeFee
    ? new BigNumber(depositQuantityInAssetUnits)
        .multipliedBy(new BigNumber('0.02'))
        .toFixed(0)
    : '0';
  const execution = {
    liquidity: depositQuantityInAssetUnits,
    amountA: depositQuantityInAssetUnits,
    amountB: depositQuantityInAssetUnits,
    feeAmountA: feeAmount,
    feeAmountB: feeAmount,
    baseAssetAddress: token0.address,
    quoteAssetAddress: token1.address,
  };

  await exchange.executeRemoveLiquidity(
    {
      signatureHashVersion: 2,
      origination: 0,
      nonce: 0,
      wallet: ownerWallet,
      assetA: token0.address,
      assetB: token1.address,
      liquidity: depositQuantityInAssetUnits,
      amountAMin: depositQuantityInAssetUnits,
      amountBMin: depositQuantityInAssetUnits,
      to,
      deadline,
      signature: '0x',
    },
    execution,
    { from: ownerWallet },
  );

  return { execution };
}

async function removeLiquidityETHAndExecute(
  depositQuantity: string,
  ownerWallet: string,
  exchange: ExchangeInstance,
  pair: IIDEXPairInstance,
  token: TestTokenInstance,
  includeFee = false,
  decimals = 18,
): Promise<{
  execution: ExchangeInstance['executeRemoveLiquidity']['arguments'][1];
}> {
  const depositQuantityInAssetUnits = decimalToAssetUnits(
    depositQuantity,
    decimals,
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

  const feeAmount = includeFee
    ? new BigNumber(depositQuantityInAssetUnits)
        .multipliedBy(new BigNumber('0.02'))
        .toFixed(0)
    : '0';
  const execution = {
    liquidity: depositQuantityInAssetUnits,
    amountA: depositQuantityInAssetUnits,
    amountB: depositQuantityInAssetUnits,
    feeAmountA: feeAmount,
    feeAmountB: feeAmount,
    baseAssetAddress: token.address,
    quoteAssetAddress: bnbAddress,
  };

  await exchange.executeRemoveLiquidity(
    {
      signatureHashVersion: 2,
      origination: 0,
      nonce: 0,
      wallet: ownerWallet,
      assetA: token.address,
      assetB: bnbAddress,
      liquidity: depositQuantityInAssetUnits,
      amountAMin: depositQuantityInAssetUnits,
      amountBMin: depositQuantityInAssetUnits,
      to: ownerWallet,
      deadline,
      signature: '0x',
    },
    execution,
    { from: ownerWallet },
  );

  return { execution };
}

async function generateOffChainLiquidityAddition(
  depositQuantityInAssetUnits: string,
  ownerWallet: string,
  exchange: ExchangeInstance,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
): Promise<{
  addition: LiquidityAddition;
  execution: ExchangeInstance['executeAddLiquidity']['arguments'][1];
}> {
  await token0.approve(exchange.address, depositQuantityInAssetUnits);
  await token1.approve(exchange.address, depositQuantityInAssetUnits);
  await exchange.depositTokenByAddress(
    token0.address,
    depositQuantityInAssetUnits,
  );
  await exchange.depositTokenByAddress(
    token1.address,
    depositQuantityInAssetUnits,
  );

  const addition: LiquidityAddition = {
    signatureHashVersion,
    nonce: uuidv1(),
    wallet: ownerWallet,
    assetA: token0.address,
    assetB: token1.address,
    amountADesired: depositQuantityInAssetUnits,
    amountBDesired: depositQuantityInAssetUnits,
    amountAMin: depositQuantityInAssetUnits,
    amountBMin: depositQuantityInAssetUnits,
    to: ownerWallet,
    deadline: 0,
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

  return { addition, execution };
}

async function generateOffChainLiquidityRemoval(
  depositQuantityInAssetUnits: string,
  ownerWallet: string,
  exchange: ExchangeInstance,
  pair: IIDEXPairInstance,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
): Promise<{
  removal: LiquidityRemoval;
  execution: ExchangeInstance['executeAddLiquidity']['arguments'][1];
}> {
  await pair.approve(exchange.address, depositQuantityInAssetUnits, {
    from: ownerWallet,
  });
  await exchange.depositTokenByAddress(
    pair.address,
    depositQuantityInAssetUnits,
  );

  const removal: LiquidityRemoval = {
    signatureHashVersion,
    nonce: uuidv1(),
    wallet: ownerWallet,
    assetA: token0.address,
    assetB: token1.address,
    liquidity: depositQuantityInAssetUnits,
    amountAMin: depositQuantityInAssetUnits,
    amountBMin: depositQuantityInAssetUnits,
    to: ownerWallet,
    deadline: 0,
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

  return { removal, execution };
}
