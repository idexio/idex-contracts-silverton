import BigNumber from 'bignumber.js';
import { v1 as uuidv1 } from 'uuid';

import type {
  ExchangeInstance,
  TestTokenInstance,
} from '../../types/truffle-contracts';

import {
  deployAndAssociateContracts,
  deployAndRegisterToken,
  bnbAddress,
  ethSymbol,
  getSignature,
} from './helpers';
import {
  decimalToAssetUnits,
  decimalToPips,
  getOrderHash,
  getPoolTradeArguments,
  Order,
  OrderSide,
  OrderType,
  Trade,
  uuidToHexString,
} from '../../lib';

const tokenSymbol = 'TKN';
const marketSymbol = `${tokenSymbol}-${ethSymbol}`;
const minimumLiquidity = 1000;

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
      await token.transfer(buyWallet, decimalToAssetUnits('1000.00000000', 18));
      await deposit(exchange, token, buyWallet, '1000.00000000', '1.00000000');
      const { buyOrder, fill } = await generateOrderAndPoolFill(
        token.address,
        bnbAddress,
        buyWallet,
        '909.09090909',
        '0.00121000',
      );
      fill.grossQuoteQuantity = '1.00000000';
      fill.netQuoteQuantity = fill.grossQuoteQuantity;
      const buySignature = await getSignature(
        web3,
        getOrderHash(buyOrder),
        buyWallet,
      );

      // https://github.com/microsoft/TypeScript/issues/28486
      await (exchange.executePoolTrade as any)(
        ...getPoolTradeArguments(buyOrder, buySignature, fill),
      );
    });
  });
});

const deposit = async (
  exchange: ExchangeInstance,
  token: TestTokenInstance,
  wallet: string,
  tokenQuantity: string,
  bnbQuantity: string,
  decimals = 18,
): Promise<void> => {
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
  await exchange.depositEther({
    value: decimalToAssetUnits(bnbQuantity, decimals),
    from: wallet,
  });
};

const generateOrderAndPoolFill = async (
  baseAssetAddress: string,
  quoteAssetAddress: string,
  wallet: string,
  quantity = '0.00100000',
  price = '1000.00000000', // 1000 BNB buys 1 TKN
  market = marketSymbol,
): Promise<{ buyOrder: Order; fill: Trade }> => {
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

  const fill: Trade = {
    baseAssetAddress,
    quoteAssetAddress,
    grossBaseQuantity: quantity,
    grossQuoteQuantity: quoteQuantity,
    netBaseQuantity: quantity, // No fee
    netQuoteQuantity: quoteQuantity, // No fee
    makerFeeAssetAddress: quoteAssetAddress,
    takerFeeAssetAddress: baseAssetAddress,
    makerFeeQuantity: '0',
    takerFeeQuantity: '0',
    price,
    makerSide: OrderSide.Sell,
  };

  return { buyOrder, fill };
};
