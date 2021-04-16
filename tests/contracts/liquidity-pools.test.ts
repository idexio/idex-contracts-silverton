/*
import BigNumber from 'bignumber.js';
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

import {
  CustodianInstance,
  ExchangeInstance,
  TestTokenInstance,
} from '../../types/truffle-contracts';
import { deployAndAssociateContracts, deployAndRegisterToken } from './helpers';

const tokenSymbol = 'DIL';

contract('Exchange (liquidity pools)', ([ownerWallet]) => {
  describe('promotePool', () => {
    it('should work', async () => {
      const { custodian, exchange } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);
      await deployPancakeCoreAndCreatePool(ownerWallet, custodian, token);
    });
  });
});

async function deployPancakeCoreAndCreatePool(
  ownerWallet: string,
  custodian: CustodianInstance,
  token: TestTokenInstance,
  feeWallet = ownerWallet,
) {
  const WBNB = artifacts.require('WBNB');
  const TestFactory = artifacts.require('TestFactory');
  const factory = await TestFactory.new(feeWallet, custodian.address);

  const pair = await factory.createPair(
    token.address,
    (await WBNB.new()).address,
  );
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
