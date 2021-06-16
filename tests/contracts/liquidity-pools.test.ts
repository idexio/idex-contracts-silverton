import BigNumber from 'bignumber.js';
import { v1 as uuidv1 } from 'uuid';

import {
  ethAddress,
  decimalToAssetUnits,
  decimalToPips,
  getAddLiquidityArguments,
  getLiquidityAdditionHash,
  getLiquidityRemovalHash,
  getRemoveLiquidityArguments,
  LiquidityAddition,
  LiquidityRemoval,
  signatureHashVersion,
  assetUnitsToPips,
  pipsToAssetUnits,
} from '../../lib';
import {
  CustodianInstance,
  ExchangeInstance,
  IPancakePairInstance,
  FactoryInstance,
  LiquidityProviderTokenInstance,
  TestTokenInstance,
  WETHInstance,
  FarmInstance,
} from '../../types/truffle-contracts';
import {
  deployAndAssociateContracts,
  deployAndRegisterToken,
  getSignature,
} from './helpers';

const minimumLiquidity = new BigNumber('1000');

const token0Symbol = 'DIL';

contract.only('Exchange (liquidity pools)', ([ownerWallet]) => {
  describe('fundPool', () => {
    it('should work', async () => {
      const depositQuantity = '1.00000000';
      const {
        custodian,
        exchange,
        token,
        weth,
      } = await deployContractsAndCreateHybridETHPool(
        depositQuantity,
        depositQuantity,
        ownerWallet,
      );

      const expectedQuantity = new BigNumber(
        decimalToAssetUnits(depositQuantity, 18),
      )
        .minus(minimumLiquidity)
        .toString();

      const tokenEvents = await token.getPastEvents('Transfer', {
        fromBlock: 0,
      });
      expect(tokenEvents).to.be.an('array');
      expect(tokenEvents.length).to.equal(4);
      expect(tokenEvents[2].returnValues.value).to.equal(expectedQuantity);
      expect(tokenEvents[2].returnValues.to).to.equal(exchange.address);
      expect(tokenEvents[3].returnValues.value).to.equal(expectedQuantity);
      expect(tokenEvents[3].returnValues.to).to.equal(custodian.address);

      const wethEvents = await weth.getPastEvents('Transfer', {
        fromBlock: 0,
      });
      expect(wethEvents).to.be.an('array');
      expect(wethEvents.length).to.equal(2);
      expect(wethEvents[1].returnValues.wad).to.equal(expectedQuantity);
      expect(wethEvents[1].returnValues.dst).to.equal(exchange.address);

      const pool = await exchange.loadLiquidityPoolByAssetAddresses(
        token.address,
        ethAddress,
      );
      expect(pool.baseAssetReserveInPips).to.equal(
        assetUnitsToPips(expectedQuantity, 18),
      );
      expect(pool.quoteAssetReserveInPips).to.equal(
        assetUnitsToPips(expectedQuantity, 18),
      );
    });
  });

  describe('addLiquidity', () => {
    it('should work with no fees', async () => {
      const depositQuantity = '1.00000000';
      const {
        exchange,
        lpToken,
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
      );

      const transferEvents = await lpToken.getPastEvents('Transfer', {
        fromBlock: 0,
      });
      expect(transferEvents).to.be.an('array');
      expect(transferEvents.length).to.equal(2);
      expect(transferEvents[1].returnValues.value).to.equal(
        execution.liquidity,
      );

      const mintEvents = await lpToken.getPastEvents('Mint', {
        fromBlock: 0,
      });
      expect(mintEvents).to.be.an('array');
      expect(mintEvents.length).to.equal(2);
      expect(mintEvents[1].returnValues.baseAssetAddress).to.equal(
        decimalToAssetUnits(depositQuantity, 18),
      );
      expect(mintEvents[1].returnValues.quoteAssetAddress).to.equal(
        decimalToAssetUnits(depositQuantity, 18),
      );
    });

    /*
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
  */
  });
});

export async function deployPancakeCoreAndCreatePool(
  ownerWallet: string,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
  feeWallet = ownerWallet,
): Promise<{
  factory: FactoryInstance;
  pair: IPancakePairInstance;
}> {
  const Factory = artifacts.require('Factory');
  const IPancakePair = artifacts.require('IPancakePair');
  const factory = await Factory.new(feeWallet);

  const pairAddress = (await factory.createPair(token0.address, token1.address))
    .logs[0].args.pair;
  const pair = await IPancakePair.at(pairAddress);

  return { factory, pair };
}

export async function deployPancakeCoreAndCreateETHPool(
  ownerWallet: string,
  token: TestTokenInstance,
  weth: WETHInstance,
  feeWallet = ownerWallet,
): Promise<{
  factory: FactoryInstance;
  pair: IPancakePairInstance;
}> {
  const Factory = artifacts.require('Factory');
  const IPancakePair = artifacts.require('IPancakePair');
  const factory = await Factory.new(feeWallet);

  const tx = await factory.createPair(token.address, weth.address);
  const pairAddress = tx.logs[0].args.pair;
  const pair = await IPancakePair.at(pairAddress);

  return { factory, pair };
}

/*
function getBaseReserve(
  desiredBaseReserve: string,
  desiredQuoteReserve: string,
): string {
  const desiredLiquidity = new BigNumber(
    decimalToAssetUnits(desiredBaseReserve, 18),
  )
    .multipliedBy(new BigNumber(decimalToAssetUnits(desiredQuoteReserve, 18)))
    .squareRoot();

  return desiredLiquidity
    .plus(minimumLiquidity)
    .pow(2)
    .dividedBy(decimalToAssetUnits(desiredQuoteReserve, 18))
    .toFixed(0);
}
*/

export async function deployContractsAndCreateHybridPool(
  initialBaseReserve: string,
  initialQuoteReserve: string,
  ownerWallet: string,
  feeWallet = ownerWallet,
): Promise<{
  custodian: CustodianInstance;
  exchange: ExchangeInstance;
  lpToken: LiquidityProviderTokenInstance;
  pair: IPancakePairInstance;
  token0: TestTokenInstance;
  token1: TestTokenInstance;
}> {
  const { custodian, exchange, farm } = await deployAndAssociateContracts();
  const token0 = await deployAndRegisterToken(exchange, token0Symbol);
  const token1 = await deployAndRegisterToken(exchange, token0Symbol);
  const { factory, pair } = await deployPancakeCoreAndCreatePool(
    ownerWallet,
    token0,
    token1,
    feeWallet,
  );

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
  const lpBalance = await pair.balanceOf(ownerWallet);

  await farm.add(100, pair.address, true);
  await pair.approve(farm.address, lpBalance);
  await farm.deposit(0, lpBalance);

  const Migrator = artifacts.require('Migrator');
  const migrator = await Migrator.new(
    farm.address,
    factory.address,
    custodian.address,
    0,
  );
  await exchange.setMigrator(migrator.address);
  await farm.setMigrator(migrator.address);
  await farm.migrate(0, 1); // token1 is quote

  const LiquidityProviderToken = artifacts.require('LiquidityProviderToken');
  const lpToken = await LiquidityProviderToken.at((await farm.poolInfo(0))[0]);
  const pairSymbol = await pair.symbol();
  await exchange.registerToken(lpToken.address, pairSymbol, 18);
  await exchange.confirmTokenRegistration(lpToken.address, pairSymbol, 18);

  return { custodian, exchange, lpToken, pair, token0, token1 };
}

export async function deployContractsAndCreateHybridETHPool(
  initialBaseReserve: string,
  initialQuoteReserve: string,
  ownerWallet: string,
  feeWallet = ownerWallet,
): Promise<{
  custodian: CustodianInstance;
  exchange: ExchangeInstance;
  farm: FarmInstance;
  pair: IPancakePairInstance;
  token: TestTokenInstance;
  weth: WETHInstance;
}> {
  const {
    custodian,
    exchange,
    farm,
    weth,
  } = await deployAndAssociateContracts();
  const token = await deployAndRegisterToken(exchange, token0Symbol);
  const { factory, pair } = await deployPancakeCoreAndCreateETHPool(
    ownerWallet,
    token,
    weth,
    feeWallet,
  );

  await weth.deposit({
    value: decimalToAssetUnits(initialQuoteReserve, 18),
    from: ownerWallet,
  });
  await weth.transfer(
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
  const lpBalance = await pair.balanceOf(ownerWallet);

  await farm.add(100, pair.address, true);
  await pair.approve(farm.address, lpBalance);
  await farm.deposit(0, lpBalance);

  const Migrator = artifacts.require('Migrator');
  const migrator = await Migrator.new(
    farm.address,
    factory.address,
    custodian.address,
    0,
  );
  await exchange.setMigrator(migrator.address);
  await farm.setMigrator(migrator.address);
  await farm.migrate(0, weth.address === (await pair.token0()) ? 0 : 1);

  const lpToken = (await farm.poolInfo(0))[0];
  const pairSymbol = await pair.symbol();
  await exchange.registerToken(lpToken, pairSymbol, 18);
  await exchange.confirmTokenRegistration(lpToken, pairSymbol, 18);

  return { custodian, exchange, farm, pair, token, weth };
}

async function addLiquidityAndExecute(
  depositQuantity: string,
  ownerWallet: string,
  exchange: ExchangeInstance,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
  includeFee = false,
  decimals = 18,
  token0Override?: string,
  token1Override?: string,
  liquidityOverride?: string,
): Promise<{
  execution: ExchangeInstance['executeAddLiquidity']['arguments'][1];
}> {
  const depositQuantityInAssetUnits = decimalToAssetUnits(
    depositQuantity,
    decimals,
  );

  const amountA = token0Override || depositQuantityInAssetUnits;
  const amountB = token1Override || depositQuantityInAssetUnits;

  await token0.approve(exchange.address, amountA, {
    from: ownerWallet,
  });
  await token1.approve(exchange.address, amountB, {
    from: ownerWallet,
  });

  const deadline = Date.now() + 10000;
  await exchange.addLiquidity(
    token0.address,
    token1.address,
    amountA,
    amountB,
    amountA,
    amountB,
    ownerWallet,
    deadline,
  );

  const LiquidityProviderToken = artifacts.require('LiquidityProviderToken');
  const pool = await exchange.loadLiquidityPoolByAssetAddresses(
    token0.address,
    token1.address,
  );

  const feeAmount = includeFee
    ? new BigNumber(amountA).multipliedBy(new BigNumber('0.02')).toFixed(0)
    : '0';

  const lpToken = await LiquidityProviderToken.at(pool.liquidityProviderToken);
  const totalSupply = new BigNumber((await lpToken.totalSupply()).toString());
  const liquidity =
    liquidityOverride ||
    BigNumber.min(
      new BigNumber(amountA)
        .dividedBy(
          new BigNumber(
            pipsToAssetUnits(pool.baseAssetReserveInPips.toString(), 18),
          ),
        )
        .multipliedBy(totalSupply),
      new BigNumber(amountB)
        .dividedBy(
          new BigNumber(
            pipsToAssetUnits(pool.quoteAssetReserveInPips.toString(), 18),
          ),
        )
        .multipliedBy(totalSupply),
    )
      .minus(new BigNumber(feeAmount))
      .toFixed(0, BigNumber.ROUND_FLOOR);

  const execution = {
    liquidity,
    amountA,
    amountB,
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
      amountADesired: amountA,
      amountBDesired: amountB,
      amountAMin: amountA,
      amountBMin: amountB,
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
    quoteAssetAddress: ethAddress,
  };

  await exchange.executeAddLiquidity(
    {
      signatureHashVersion: 2,
      origination: 0,
      nonce: 0,
      wallet: ownerWallet,
      assetA: token.address,
      assetB: ethAddress,
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
  pair: IPancakePairInstance,
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
  pair: IPancakePairInstance,
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
    quoteAssetAddress: ethAddress,
  };

  await exchange.executeRemoveLiquidity(
    {
      signatureHashVersion: 2,
      origination: 0,
      nonce: 0,
      wallet: ownerWallet,
      assetA: token.address,
      assetB: ethAddress,
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

async function generateOnChainLiquidityAddition(
  exchange: ExchangeInstance,
  depositQuantityInAssetUnits: string,
  ownerWallet: string,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
): Promise<{
  addition: ExchangeInstance['executeAddLiquidity']['arguments'][0];
  execution: ExchangeInstance['executeAddLiquidity']['arguments'][1];
}> {
  const deadline = Date.now() + 10000;

  await token0.approve(exchange.address, depositQuantityInAssetUnits);
  await token1.approve(exchange.address, depositQuantityInAssetUnits);
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
    deadline,
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

  return { addition, execution };
}

async function generateOnChainLiquidityRemoval(
  exchange: ExchangeInstance,
  pair: IPancakePairInstance,
  depositQuantityInAssetUnits: string,
  ownerWallet: string,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
): Promise<{
  removal: ExchangeInstance['executeRemoveLiquidity']['arguments'][0];
  execution: ExchangeInstance['executeRemoveLiquidity']['arguments'][1];
}> {
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
    deadline,
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

  return { removal, execution };
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
  pair: IPancakePairInstance,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
  skipPairTokenDeposit = false,
): Promise<{
  removal: LiquidityRemoval;
  execution: ExchangeInstance['executeAddLiquidity']['arguments'][1];
}> {
  if (!skipPairTokenDeposit) {
    await pair.approve(exchange.address, depositQuantityInAssetUnits, {
      from: ownerWallet,
    });
    await exchange.depositTokenByAddress(
      pair.address,
      depositQuantityInAssetUnits,
    );
  }

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
