/*
import { v1 as uuidv1 } from 'uuid';

import type {
  ExchangeInstance,
  TestTokenInstance,
} from '../../types/truffle-contracts';

import {
  bnbAddress,
  deployAndAssociateContracts,
  deployAndRegisterToken,
  ethSymbol,
  getSignature,
} from './helpers';
import { generateOrdersAndFill } from './trade.test';
import {
  decimalToAssetUnits,
  decimalToPips,
  getHybridTradeArguments,
  getOrderHash,
  getPoolTradeArguments,
  Order,
  OrderSide,
  OrderType,
  PoolTrade,
  uuidToHexString,
} from '../../lib';

const tokenSymbol = 'TKN';
const marketSymbol = `${tokenSymbol}-${ethSymbol}`;
const minimumLiquidity = 1000;
*/

import BigNumber from 'bignumber.js';

import { assetUnitsToPips } from '../../lib';
import {
  CustodianInstance,
  IPairInstance,
  TestFactoryInstance,
  TestTokenInstance,
  WBNBInstance,
} from '../../types/truffle-contracts';
import {
  deployAndAssociateContracts,
  deployAndRegisterToken,
  bnbAddress,
} from './helpers';

const minimumLiquidity = '1000';

const tokenSymbol = 'DIL';

contract('Exchange (liquidity pools)', ([ownerWallet]) => {
  describe('promotePool', () => {
    it('should work', async () => {
      const depositQuantity = web3.utils.toWei('1', 'ether');
      const {
        exchange,
        pair,
        token,
      } = await deployContractsAndCreateHybridPool(
        depositQuantity,
        ownerWallet,
      );

      const expectedLiquidity = new BigNumber(depositQuantity).minus(
        minimumLiquidity,
      );
      const events = await pair.getPastEvents('Transfer', {
        fromBlock: 0,
      });
      expect(events).to.be.an('array');
      expect(events.length).to.equal(2);
      expect(events[0].returnValues.value).to.equal(minimumLiquidity);
      expect(events[1].returnValues.value).to.equal(
        expectedLiquidity.toString(),
      );

      const pool = await exchange.loadLiquidityPoolByAssetAddresses(
        token.address,
        bnbAddress,
      );
      expect(pool.baseAssetReserveInPips).to.equal(
        assetUnitsToPips(depositQuantity, 18),
      );
      expect(pool.quoteAssetReserveInPips).to.equal(
        assetUnitsToPips(depositQuantity, 18),
      );
    });
  });

  describe('addLiquidityETH', () => {
    it.only('should work', async () => {
      const depositQuantity = web3.utils.toWei('1', 'ether');
      const {
        exchange,
        pair,
        token,
      } = await deployContractsAndCreateHybridPool(
        depositQuantity,
        ownerWallet,
      );
      await exchange.setDispatcher(ownerWallet);
      await token.approve(exchange.address, depositQuantity, {
        from: ownerWallet,
      });

      const deadline = Date.now() + 10000;
      await exchange.addLiquidityETH(
        token.address,
        depositQuantity,
        depositQuantity,
        depositQuantity,
        ownerWallet,
        deadline,
        { value: depositQuantity },
      );

      await exchange.executeAddLiquidity(
        {
          wallet: ownerWallet,
          assetA: token.address,
          assetB: bnbAddress,
          amountADesired: depositQuantity,
          amountBDesired: depositQuantity,
          amountAMin: depositQuantity,
          amountBMin: depositQuantity,
          to: ownerWallet,
          deadline,
        },
        {
          liquidity: depositQuantity,
          amountA: depositQuantity,
          amountB: depositQuantity,
          feeAmountA: '0',
          feeAmountB: '0',
          baseAssetAddress: token.address,
          quoteAssetAddress: bnbAddress,
        },
        { from: ownerWallet },
      );

      const transferEvents = await pair.getPastEvents('Transfer', {
        fromBlock: 0,
      });
      expect(transferEvents).to.be.an('array');
      expect(transferEvents.length).to.equal(3);
      expect(transferEvents[2].returnValues.value).to.equal(depositQuantity);

      const mintEvents = await pair.getPastEvents('Mint', {
        fromBlock: 0,
      });
      expect(mintEvents).to.be.an('array');
      expect(mintEvents.length).to.equal(3);
      expect(mintEvents[2].returnValues.value).to.equal(depositQuantity);
    });
  });
});

async function deployContractsAndCreateHybridPool(
  depositQuantity: string,
  ownerWallet: string,
  feeWallet = ownerWallet,
) {
  const { custodian, exchange, wbnb } = await deployAndAssociateContracts();
  const token = await deployAndRegisterToken(exchange, tokenSymbol);
  const { factory, pair } = await deployPancakeCoreAndCreatePool(
    ownerWallet,
    custodian,
    token,
    wbnb,
    feeWallet,
  );
  await exchange.setPairFactoryAddress(factory.address);

  await wbnb.deposit({ value: depositQuantity, from: ownerWallet });
  await wbnb.transfer(pair.address, depositQuantity, { from: ownerWallet });
  await token.transfer(pair.address, depositQuantity, {
    from: ownerWallet,
  });
  await pair.mint(ownerWallet);

  await exchange.promotePool(token.address, bnbAddress, pair.address);

  return { exchange, pair, token };
}

async function deployPancakeCoreAndCreatePool(
  ownerWallet: string,
  custodian: CustodianInstance,
  token: TestTokenInstance,
  wbnb: WBNBInstance,
  feeWallet = ownerWallet,
): Promise<{
  factory: TestFactoryInstance;
  pair: IPairInstance;
}> {
  const TestFactory = artifacts.require('TestFactory');
  const IPair = artifacts.require('IPair');
  const factory = await TestFactory.new(feeWallet, custodian.address);

  const pairAddress = (await factory.createPair(token.address, wbnb.address))
    .logs[0].args.pair;
  const pair = await IPair.at(pairAddress);

  return { factory, pair };
}

/*
contract('Exchange (liquidity pools)', (accounts) => {
  describe('addLiquidityPool', () => {
    it('should work', async () => {
      const { exchange } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);

      await exchange.addLiquidityPool(token.address, bnbAddress);
    });
  });

  describe('addLiquidity', () => {
    it('should work', async () => {
      const lpDepositQuantity = minimumLiquidity + 1;

      const { exchange } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);
      await exchange.addLiquidityPool(token.address, bnbAddress);
      await exchange.setDispatcher(accounts[0]);

      await deposit(
        exchange,
        token,
        accounts[0],
        '10000.00000000',
        '10.00000000',
      );

      await exchange.addLiquidity({
        nonce: uuidToHexString(uuidv1()),
        walletAddress: accounts[0],
        baseAssetSymbol: tokenSymbol,
        quoteAssetSymbol: ethSymbol,
        baseAssetDesiredQuantityInPips: lpDepositQuantity,
        quoteAssetDesiredQuantityInPips: lpDepositQuantity,
        baseAssetMinimumQuantityInPips: lpDepositQuantity,
        quoteAssetMinimumQuantityInPips: lpDepositQuantity,
        walletSignature: '0x',
      });

      const events = await exchange.getPastEvents('LiquidityMint', {
        fromBlock: 0,
      });
      expect(events).to.be.an('array');
      expect(events.length).to.equal(1);
      expect(
        parseInt(events[0].returnValues.liquiditySharesMinted, 10),
      ).to.equal(1);

      await exchange.addLiquidity({
        nonce: uuidToHexString(uuidv1()),
        walletAddress: accounts[0],
        baseAssetSymbol: tokenSymbol,
        quoteAssetSymbol: ethSymbol,
        baseAssetDesiredQuantityInPips: 1,
        quoteAssetDesiredQuantityInPips: 1,
        baseAssetMinimumQuantityInPips: 1,
        quoteAssetMinimumQuantityInPips: 1,
        walletSignature: '0x',
      });

      const events2 = await exchange.getPastEvents('LiquidityMint', {
        fromBlock: 0,
      });
      expect(events2.length).to.equal(2);
      expect(
        parseInt(events2[1].returnValues.liquiditySharesMinted, 10),
      ).to.equal(1);
    });
  });

  describe('executePoolTrade', () => {
    it('should work', async () => {
      const initialBaseReserve = '10000.00000000';
      const initialQuoteReserve = '10.00000000';

      const { exchange } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);
      await exchange.addLiquidityPool(token.address, bnbAddress);
      await exchange.setDispatcher(accounts[0]);

      await deposit(
        exchange,
        token,
        accounts[0],
        initialBaseReserve,
        initialQuoteReserve,
      );
      await exchange.addLiquidity({
        nonce: uuidToHexString(uuidv1()),
        walletAddress: accounts[0],
        baseAssetSymbol: tokenSymbol,
        quoteAssetSymbol: ethSymbol,
        baseAssetDesiredQuantityInPips: decimalToPips(initialBaseReserve),
        quoteAssetDesiredQuantityInPips: decimalToPips(initialQuoteReserve),
        baseAssetMinimumQuantityInPips: decimalToPips(initialBaseReserve),
        quoteAssetMinimumQuantityInPips: decimalToPips(initialQuoteReserve),
        walletSignature: '0x',
      });

      const buyWallet = accounts[1];
      await deposit(exchange, token, buyWallet, '0.00000000', '1.00000000');
      const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
        token.address,
        bnbAddress,
        buyWallet,
        '909.09090909',
        '0.00121000',
      );
      poolTrade.grossQuoteQuantity = '1.00000000';
      const buySignature = await getSignature(
        web3,
        getOrderHash(buyOrder),
        buyWallet,
      );

      // https://github.com/microsoft/TypeScript/issues/28486
      await (exchange.executePoolTrade as any)(
        ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
      );
    });
  });

  describe('executeHybridTrade', () => {
    it.only('should work', async () => {
      const initialBaseReserve = '10000.00000000';
      const initialQuoteReserve = '10.00000000';

      const { exchange } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);
      await exchange.addLiquidityPool(token.address, bnbAddress);
      await exchange.setDispatcher(accounts[0]);

      await deposit(
        exchange,
        token,
        accounts[0],
        initialBaseReserve,
        initialQuoteReserve,
      );
      await exchange.addLiquidity({
        nonce: uuidToHexString(uuidv1()),
        walletAddress: accounts[0],
        baseAssetSymbol: tokenSymbol,
        quoteAssetSymbol: ethSymbol,
        baseAssetDesiredQuantityInPips: decimalToPips(initialBaseReserve),
        quoteAssetDesiredQuantityInPips: decimalToPips(initialQuoteReserve),
        baseAssetMinimumQuantityInPips: decimalToPips(initialBaseReserve),
        quoteAssetMinimumQuantityInPips: decimalToPips(initialQuoteReserve),
        walletSignature: '0x',
      });

      const buyWallet = accounts[1];
      const sellWallet = accounts[2];
      await deposit(exchange, token, buyWallet, '0.00000000', '10.00000000');
      await token.transfer(
        sellWallet,
        decimalToAssetUnits('5000.00000000', 18),
      );
      await deposit(exchange, token, sellWallet, '5000.00000000', '0.00000000');

      await generateAndExecuteHybridTrade(
        exchange,
        token,
        buyWallet,
        sellWallet,
        web3,
      );

      await generateAndExecuteHybridTrade(
        exchange,
        token,
        buyWallet,
        sellWallet,
        web3,
        '0.00144000',
        '1515.15151512',
        '757.57575756',
      );
    });
  });
});

const generateAndExecuteHybridTrade = async (
  exchange: ExchangeInstance,
  token: TestTokenInstance,
  buyWallet: string,
  sellWallet: string,
  web3: Web3,
  price = '0.00121000',
  takerOrderBaseQuantity = '1818.18181818',
  poolTradeBaseQuantity = '909.09090909',
  counterpartyTradeBaseQuantity = poolTradeBaseQuantity,
  poolTradeQuoteQuantity = '1.00000000',
): Promise<void> => {
  const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
    token.address,
    bnbAddress,
    buyWallet,
    takerOrderBaseQuantity,
    price,
  );
  const buySignature = await getSignature(
    web3,
    getOrderHash(buyOrder),
    buyWallet,
  );
  poolTrade.grossBaseQuantity = poolTradeBaseQuantity;
  poolTrade.grossQuoteQuantity = poolTradeQuoteQuantity;

  console.log(poolTrade);

  const { sellOrder, fill } = await generateOrdersAndFill(
    token.address,
    bnbAddress,
    buyWallet,
    sellWallet,
    counterpartyTradeBaseQuantity,
    price,
  );
  const sellSignature = await getSignature(
    web3,
    getOrderHash(sellOrder),
    sellWallet,
  );

  // https://github.com/microsoft/TypeScript/issues/28486
  console.log(
    await (exchange.executeHybridTrade as any)(
      ...getHybridTradeArguments(
        buyOrder,
        buySignature,
        sellOrder,
        sellSignature,
        fill,
        poolTrade,
      ),
    ),
  );
};

const deposit = async (
  exchange: ExchangeInstance,
  token: TestTokenInstance,
  wallet: string,
  tokenQuantity: string,
  bnbQuantity: string,
  decimals = 18,
): Promise<void> => {
  if (decimalToAssetUnits(tokenQuantity, decimals) !== '0') {
    await token.approve(
      exchange.address,
      decimalToAssetUnits(tokenQuantity, decimals),
      {
        from: wallet,
      },
    );
    await exchange.depositTokenByAddress(
      token.address,
      decimalToAssetUnits(tokenQuantity, decimals),
      {
        from: wallet,
      },
    );
  }

  if (decimalToAssetUnits(bnbQuantity, decimals) !== '0') {
    await exchange.depositEther({
      value: decimalToAssetUnits(bnbQuantity, decimals),
      from: wallet,
    });
  }
};

const generateOrderAndPoolTrade = async (
  baseAssetAddress: string,
  quoteAssetAddress: string,
  wallet: string,
  quantity = '0.00100000',
  price = '1000.00000000', // 1000 BNB buys 1 TKN
  market = marketSymbol,
): Promise<{ buyOrder: Order; poolTrade: PoolTrade }> => {
  const quoteQuantity = new BigNumber(quantity)
    .multipliedBy(new BigNumber(price))
    .toFixed(8, BigNumber.ROUND_DOWN);

  const buyOrder: Order = {
    signatureHashVersion: 2,
    nonce: uuidv1(),
    wallet,
    market,
    type: OrderType.Limit,
    side: OrderSide.Buy,
    quantity,
    isQuantityInQuote: false,
    price,
  };

  const poolTrade: PoolTrade = {
    baseAssetAddress,
    quoteAssetAddress,
    grossBaseQuantity: quantity,
    grossQuoteQuantity: quoteQuantity,
    // No fee
    takerPoolFeeQuantityInPips: '0',
    takerProtocolFeeQuantityInPips: '0',
    takerGasFeeQuantityInPips: '0',
  };

  return { buyOrder, poolTrade };
};
*/
