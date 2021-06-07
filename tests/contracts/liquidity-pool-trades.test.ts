import BigNumber from 'bignumber.js';
import { v1 as uuidv1 } from 'uuid';

import { generateOrdersAndFill } from './trade.test';
import {
  bnbAddress,
  decimalToAssetUnits,
  getHybridTradeArguments,
  getOrderHash,
  getPoolTradeArguments,
  Order,
  OrderSide,
  OrderType,
  PoolTrade,
} from '../../lib';
import {
  ExchangeInstance,
  TestTokenInstance,
} from '../../types/truffle-contracts';

import { deployContractsAndCreateHybridETHPool } from './liquidity-pools.test';
import { ethSymbol, getSignature } from './helpers';

const token0Symbol = 'DIL';
const ethMarketSymbol = `${token0Symbol}-${ethSymbol}`;

contract(
  'Exchange (liquidity pools)',
  ([ownerWallet, buyWallet, sellWallet]) => {
    describe('executePoolTrade', () => {
      it('should work with no fees for taker buy', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await deposit(exchange, token, buyWallet, '0.00000000', '1.00000000');
        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '909.09090909',
          '0.00121000',
        );
        poolTrade.netQuoteQuantity = '1.00000000';
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

      it('should work with fees for taker buy', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await deposit(exchange, token, buyWallet, '0.00000000', '1.00000000');
        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '909.09090909',
          '0.00121000',
        );
        poolTrade.netQuoteQuantity = '0.99800000'; // No protocol fee
        poolTrade.grossQuoteQuantity = '1.00000000';
        poolTrade.netBaseQuantity = '907.4277159';
        poolTrade.takerPoolFeeQuantity = '0.00200000';
        poolTrade.takerGasFeeQuantity = '0.01000000';
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

      it('should work with no fees for taker sell', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await token.transfer(
          sellWallet,
          decimalToAssetUnits('5000.00000000', 18),
        );
        await deposit(
          exchange,
          token,
          sellWallet,
          '5000.00000000',
          '0.00000000',
        );

        const {
          buyOrder: sellOrder,
          poolTrade,
        } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          sellWallet,
          '1111.11111112',
          '0.00081000',
        );
        sellOrder.side = OrderSide.Sell;
        poolTrade.netQuoteQuantity = '1.00000000';
        poolTrade.grossQuoteQuantity = '1.00000000';
        const sellSignature = await getSignature(
          web3,
          getOrderHash(sellOrder),
          sellWallet,
        );

        // https://github.com/microsoft/TypeScript/issues/28486
        await (exchange.executePoolTrade as any)(
          ...getPoolTradeArguments(sellOrder, sellSignature, poolTrade),
        );
      });

      it('should revert for exited wallet', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await exchange.exitWallet({ from: buyWallet });

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '1.00000000',
          '0.10000000',
        );
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/order wallet exit finalized/i);
      });

      it('should revert for decreasing constant product', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await deposit(exchange, token, buyWallet, '0.00000000', '10.00000000');
        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '10.00000000',
          '0.00100000',
        );
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/constant product cannot decrease/i);
      });

      it('should revert for duplicate trade pair', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '1.00000000',
          '0.10000000',
        );
        poolTrade.baseAssetAddress = poolTrade.quoteAssetAddress;
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/assets must be different/i);
      });

      it('should revert for symbol address mismatch', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const {
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '1.00000000',
          '0.10000000',
        );
        poolTrade.baseAssetAddress = pair.address;
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/symbol address mismatch/i);
      });

      it('should revert when base quantity is zero', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '1.00000000',
          '0.10000000',
        );
        poolTrade.grossBaseQuantity = '0';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(
          /base quantity must be greater than zero/i,
        );
      });

      it('should revert when quote quantity is zero', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '1.00000000',
          '0.10000000',
        );
        poolTrade.grossQuoteQuantity = '0';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(
          /quote quantity must be greater than zero/i,
        );
      });

      it('should revert when buy limit price exceeded', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '1.00000000',
          '0.10000000',
        );
        poolTrade.grossBaseQuantity = '0.50000000';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/buy order limit price exceeded/i);
      });

      it('should revert when sell limit price exceeded', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        const {
          buyOrder: sellOrder,
          poolTrade,
        } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          sellWallet,
          '1.00000000',
          '0.10000000',
        );
        sellOrder.side = OrderSide.Sell;
        poolTrade.grossBaseQuantity = '1.50000000';
        const sellSignature = await getSignature(
          web3,
          getOrderHash(sellOrder),
          sellWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(sellOrder, sellSignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/sell order limit price exceeded/i);
      });

      it('should revert for excessive base fee', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '1.00000000',
          '0.10000000',
        );
        poolTrade.netBaseQuantity = '0.50000000';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/excessive base fee/i);
      });

      it('should revert for excessive quote fee', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '1.00000000',
          '0.10000000',
        );
        poolTrade.netQuoteQuantity = '0.05000000';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/excessive quote fee/i);
      });

      it('should revert when net quote plus taker fee not equal to gross', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '1.00000000',
          '0.10000000',
        );
        poolTrade.netQuoteQuantity = '0.0980000';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/net plus fee not equal to gross/i);
      });

      it('should revert when net base plus taker fee not equal to gross', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        const {
          buyOrder: sellOrder,
          poolTrade,
        } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          sellWallet,
          '1.00000000',
          '0.10000000',
        );
        sellOrder.side = OrderSide.Sell;
        poolTrade.netBaseQuantity = '0.90000000';
        const sellSignature = await getSignature(
          web3,
          getOrderHash(sellOrder),
          sellWallet,
        );

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executePoolTrade as any)(
            ...getPoolTradeArguments(sellOrder, sellSignature, poolTrade),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/net plus fee not equal to gross/i);
      });
    });

    describe('executeHybridTrade', () => {
      it('should work with no fees', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await deposit(exchange, token, buyWallet, '0.00000000', '10.00000000');
        await token.transfer(
          sellWallet,
          decimalToAssetUnits('5000.00000000', 18),
        );
        await deposit(
          exchange,
          token,
          sellWallet,
          '5000.00000000',
          '0.00000000',
        );

        await generateAndExecuteHybridTrade(
          exchange,
          token,
          buyWallet,
          sellWallet,
          web3,
        );

        /*
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
        */
      });

      it('should work with fees', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await deposit(exchange, token, buyWallet, '0.00000000', '10.00000000');
        await token.transfer(
          sellWallet,
          decimalToAssetUnits('5000.00000000', 18),
        );
        await deposit(
          exchange,
          token,
          sellWallet,
          '5000.00000000',
          '0.00000000',
        );

        const {
          buyOrder,
          buySignature,
          sellOrder,
          sellSignature,
          fill,
          poolTrade,
        } = await generateHybridTrade(token, buyWallet, sellWallet, web3);
        poolTrade.netQuoteQuantity = '0.99800000'; // No protocol fee
        poolTrade.grossQuoteQuantity = '1.00000000';
        poolTrade.netBaseQuantity = '907.4277159';
        poolTrade.takerPoolFeeQuantity = '0.00200000';
        poolTrade.takerGasFeeQuantity = '0.01000000';

        // https://github.com/microsoft/TypeScript/issues/28486
        await (exchange.executeHybridTrade as any)(
          ...getHybridTradeArguments(
            buyOrder,
            buySignature,
            sellOrder,
            sellSignature,
            fill,
            poolTrade,
          ),
        );

        /*
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
        */
      });

      it('should work for taker sell order', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await deposit(exchange, token, buyWallet, '0.00000000', '10.00000000');
        await token.transfer(
          sellWallet,
          decimalToAssetUnits('5000.00000000', 18),
        );
        await deposit(
          exchange,
          token,
          sellWallet,
          '5000.00000000',
          '0.00000000',
        );

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '2222.22222224',
          '0.00081000',
        );
        buyOrder.quantity = '1111.11111112';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );
        poolTrade.netQuoteQuantity = '1.000000000';
        poolTrade.grossQuoteQuantity = '1.000000000';
        poolTrade.netBaseQuantity = '1111.11111112';
        poolTrade.grossBaseQuantity = '1111.11111112';

        const { sellOrder, fill } = await generateOrdersAndFill(
          token.address,
          bnbAddress,
          buyWallet,
          sellWallet,
          '1111.11111112',
          '0.00081000',
          ethMarketSymbol,
        );
        sellOrder.quantity = '2222.22222224';
        const sellSignature = await getSignature(
          web3,
          getOrderHash(sellOrder),
          sellWallet,
        );
        fill.makerSide = OrderSide.Buy;

        // https://github.com/microsoft/TypeScript/issues/28486
        await (exchange.executeHybridTrade as any)(
          ...getHybridTradeArguments(
            buyOrder,
            buySignature,
            sellOrder,
            sellSignature,
            fill,
            poolTrade,
          ),
        );
      });

      it('should revert when pool marginal buy price exceeded', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await deposit(exchange, token, buyWallet, '0.00000000', '10.00000000');
        await token.transfer(
          sellWallet,
          decimalToAssetUnits('5000.00000000', 18),
        );
        await deposit(
          exchange,
          token,
          sellWallet,
          '5000.00000000',
          '0.00000000',
        );

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '2222.22222224',
          '0.00081000',
        );
        buyOrder.price = '0.00082000';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );
        poolTrade.netQuoteQuantity = '1.000000000';
        poolTrade.grossQuoteQuantity = '1.000000000';
        poolTrade.netBaseQuantity = '1111.11111112';
        poolTrade.grossBaseQuantity = '1111.11111112';

        const { sellOrder, fill } = await generateOrdersAndFill(
          token.address,
          bnbAddress,
          buyWallet,
          sellWallet,
          '1111.11111112',
          '0.00081000',
          ethMarketSymbol,
        );
        sellOrder.quantity = '2222.22222224';
        const sellSignature = await getSignature(
          web3,
          getOrderHash(sellOrder),
          sellWallet,
        );
        fill.makerSide = OrderSide.Buy;

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executeHybridTrade as any)(
            ...getHybridTradeArguments(
              buyOrder,
              buySignature,
              sellOrder,
              sellSignature,
              fill,
              poolTrade,
            ),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/marginal buy price exceeded/i);
      });

      it('should revert when pool marginal sell price exceeded', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await deposit(exchange, token, buyWallet, '0.00000000', '10.00000000');
        await token.transfer(
          sellWallet,
          decimalToAssetUnits('5000.00000000', 18),
        );
        await deposit(
          exchange,
          token,
          sellWallet,
          '5000.00000000',
          '0.00000000',
        );

        const {
          buyOrder,
          buySignature,
          sellOrder,
          sellSignature,
          fill,
          poolTrade,
        } = await generateHybridTrade(token, buyWallet, sellWallet, web3);
        poolTrade.netQuoteQuantity = '1.00100000';
        poolTrade.grossQuoteQuantity = '1.00100000';

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executeHybridTrade as any)(
            ...getHybridTradeArguments(
              buyOrder,
              buySignature,
              sellOrder,
              sellSignature,
              fill,
              poolTrade,
            ),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/marginal sell price exceeded/i);
      });

      it('should revert for exited buy wallet', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await exchange.exitWallet({ from: buyWallet });

        let error;
        try {
          await generateAndExecuteHybridTrade(
            exchange,
            token,
            buyWallet,
            sellWallet,
            web3,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/buy wallet exit finalized/i);
      });

      it('should revert for exited sell wallet', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await exchange.exitWallet({ from: sellWallet });

        let error;
        try {
          await generateAndExecuteHybridTrade(
            exchange,
            token,
            buyWallet,
            sellWallet,
            web3,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/sell wallet exit finalized/i);
      });

      it('should revert for self-trade', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        let error;
        try {
          await generateAndExecuteHybridTrade(
            exchange,
            token,
            buyWallet,
            buyWallet,
            web3,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/self-trading not allowed/i);
      });

      it('should revert for mismatched trades', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        const {
          buyOrder,
          buySignature,
          sellOrder,
          sellSignature,
          fill,
          poolTrade,
        } = await generateHybridTrade(token, buyWallet, sellWallet, web3);
        poolTrade.quoteAssetAddress = token.address;

        let error;
        try {
          // https://github.com/microsoft/TypeScript/issues/28486
          await (exchange.executeHybridTrade as any)(
            ...getHybridTradeArguments(
              buyOrder,
              buySignature,
              sellOrder,
              sellSignature,
              fill,
              poolTrade,
            ),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/mismatched trade assets/i);
      });
    });
  },
);

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
  quantity: string,
  price: string,
  market = ethMarketSymbol,
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
    netBaseQuantity: quantity,
    netQuoteQuantity: quoteQuantity,
    // No fee
    takerPoolFeeQuantity: '0.00000000',
    takerProtocolFeeQuantity: '0.00000000',
    takerGasFeeQuantity: '0.00000000',
  };

  return { buyOrder, poolTrade };
};

const generateHybridTrade = async (
  token: TestTokenInstance,
  buyWallet: string,
  sellWallet: string,
  web3: Web3,
  price = '0.00121000',
  takerOrderBaseQuantity = '1818.18181818',
  poolTradeBaseQuantity = '909.09090909',
  orderBookTradeBaseQuantity = poolTradeBaseQuantity,
  poolTradeQuoteQuantity = '1.00000000',
) => {
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
  poolTrade.netBaseQuantity = poolTradeBaseQuantity;
  poolTrade.netQuoteQuantity = poolTradeQuoteQuantity;

  const { sellOrder, fill } = await generateOrdersAndFill(
    token.address,
    bnbAddress,
    buyWallet,
    sellWallet,
    orderBookTradeBaseQuantity,
    price,
    ethMarketSymbol,
  );
  const sellSignature = await getSignature(
    web3,
    getOrderHash(sellOrder),
    sellWallet,
  );

  return { buyOrder, buySignature, sellOrder, sellSignature, fill, poolTrade };
};

const generateAndExecuteHybridTrade = async (
  exchange: ExchangeInstance,
  token: TestTokenInstance,
  buyWallet: string,
  sellWallet: string,
  web3: Web3,
  price = '0.00121000',
  takerOrderBaseQuantity = '1818.18181818',
  poolTradeBaseQuantity = '909.09090909',
  orderBookTradeBaseQuantity = poolTradeBaseQuantity,
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
  poolTrade.netBaseQuantity = poolTradeBaseQuantity;
  poolTrade.netQuoteQuantity = poolTradeQuoteQuantity;

  const { sellOrder, fill } = await generateOrdersAndFill(
    token.address,
    bnbAddress,
    buyWallet,
    sellWallet,
    orderBookTradeBaseQuantity,
    price,
    ethMarketSymbol,
  );
  const sellSignature = await getSignature(
    web3,
    getOrderHash(sellOrder),
    sellWallet,
  );

  // https://github.com/microsoft/TypeScript/issues/28486
  await (exchange.executeHybridTrade as any)(
    ...getHybridTradeArguments(
      buyOrder,
      buySignature,
      sellOrder,
      sellSignature,
      fill,
      poolTrade,
    ),
  );
};
