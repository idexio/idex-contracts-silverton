import BigNumber from 'bignumber.js';
import { v1 as uuidv1 } from 'uuid';

import { generateOrdersAndFill } from './trade.test';
import {
  ethAddress,
  decimalToAssetUnits,
  getHybridTradeArguments,
  getOrderHash,
  getPoolTradeArguments,
  nativeAssetSymbol,
  Order,
  OrderSide,
  OrderType,
  PoolTrade,
  signatureHashVersion,
  uuidToHexString,
} from '../../lib';

import { deployContractsAndCreateHybridETHPool } from './liquidity-pools.test';
import { getSignature } from './helpers';

import { ExchangeInstance } from '../../types/truffle-contracts/Exchange';
import { TestTokenInstance } from '../../types/truffle-contracts/TestToken';

const token0Symbol = 'DIL';
const ethMarketSymbol = `${token0Symbol}-${nativeAssetSymbol}`;

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
          ethAddress,
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
          ethAddress,
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
          ethAddress,
          sellWallet,
          '1111.11111235',
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

      it('should revert for non-zero price correction', async () => {
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
          ethAddress,
          buyWallet,
          '0.10000000',
          '1.00000000',
        );
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );
        poolTrade.takerPriceCorrectionFeeQuantity = '0.00000001';

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
        expect(error.message).to.match(/price correction not allowed/i);
      });

      it('should revert for unbalanced input fees', async () => {
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
          ethAddress,
          buyWallet,
          '0.10000000',
          '1.00000000',
        );
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );
        poolTrade.takerPoolFeeQuantity = '0.00000001';

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
        expect(error.message).to.match(/pool input fees unbalanced/i);
      });

      it('should revert for excessive input fees', async () => {
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
          ethAddress,
          buyWallet,
          '0.10000000',
          '1.00000000',
        );
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );
        poolTrade.netQuoteQuantity = '0.05000000';
        poolTrade.takerPoolFeeQuantity = '0.05000000';

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
        expect(error.message).to.match(/excessive pool input fee/i);
      });

      it('should revert for base reserve below min', async () => {
        const initialBaseReserve = '1.00000000';
        const initialQuoteReserve = '0.10000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await deposit(exchange, token, buyWallet, '0.00000000', '1.00000000');

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          ethAddress,
          buyWallet,
          '0.10000000',
          '1.00000000',
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
        expect(error.message).to.match(/base reserves below min/i);
      });

      it('should revert for quote reserve below min', async () => {
        const initialBaseReserve = '10.00000000';
        const initialQuoteReserve = '1.00000000';

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
        await deposit(exchange, token, sellWallet, '10.00000000', '0.00000000');

        const {
          buyOrder: sellOrder,
          poolTrade,
        } = await generateOrderAndPoolTrade(
          token.address,
          ethAddress,
          sellWallet,
          '1.00000000',
          '0.01000000',
        );
        sellOrder.side = OrderSide.Sell;
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
        expect(error.message).to.match(/quote reserves below min/i);
      });

      it('should revert for invalidated nonce', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await exchange.invalidateOrderNonce(
          uuidToHexString(uuidv1({ msecs: new Date().getTime() + 100000 })),
          { from: buyWallet },
        );

        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          ethAddress,
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
        expect(error.message).to.match(/order nonce timestamp too low/i);
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
          ethAddress,
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
          ethAddress,
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
          ethAddress,
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
          ethAddress,
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
          ethAddress,
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
          ethAddress,
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
          ethAddress,
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
          ethAddress,
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

      it('should revert for excessive output adjustment', async () => {
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
          ethAddress,
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
        expect(error.message).to.match(/excessive pool output adjustment/i);
      });

      it('should revert for excessive gas fee', async () => {
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
          ethAddress,
          buyWallet,
          '1.00000000',
          '0.10000000',
        );
        poolTrade.takerGasFeeQuantity = '0.50000000';
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
        expect(error.message).to.match(/excessive gas fee/i);
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
          ethAddress,
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
        expect(error.message).to.match(/input fees unbalanced/i);
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
          ethAddress,
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
        expect(error.message).to.match(/input fees unbalanced/i);
      });

      it('should revert when order signature invalid', async () => {
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
          ethAddress,
          buyWallet,
          '1.00000000',
          '0.10000000',
        );
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );
        buyOrder.quantity = '1.00100000';

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
        expect(error.message).to.match(/invalid wallet signature/i);
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

        // https://github.com/microsoft/TypeScript/issues/28486
        await (exchange.executeHybridTrade as any)(
          ...getHybridTradeArguments(
            buyOrder,
            buySignature,
            sellOrder,
            sellSignature,
            fill,
            poolTrade,
            '0.01000000',
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
          ethAddress,
          buyWallet,
          '2222.22222470',
          '0.00080999',
        );
        buyOrder.quantity = '1111.11111235';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );
        poolTrade.netQuoteQuantity = '1.000000000';
        poolTrade.grossQuoteQuantity = '1.000000000';
        poolTrade.netBaseQuantity = '1111.11111235';
        poolTrade.grossBaseQuantity = '1111.11111235';

        const { sellOrder, fill } = await generateOrdersAndFill(
          token.address,
          ethAddress,
          buyWallet,
          sellWallet,
          '1111.11111235',
          '0.00080999',
          ethMarketSymbol,
        );
        sellOrder.quantity = '2222.22222470';
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

      it('should work for taker sell order with price correction', async () => {
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

        const { buyOrder, sellOrder, fill } = await generateOrdersAndFill(
          token.address,
          ethAddress,
          buyWallet,
          sellWallet,
          '1111.11111235',
          '0.00080999',
          ethMarketSymbol,
        );
        sellOrder.price = '0.00080998';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );
        const sellSignature = await getSignature(
          web3,
          getOrderHash(sellOrder),
          sellWallet,
        );
        fill.makerSide = OrderSide.Buy;

        const poolTrade: PoolTrade = {
          baseAssetAddress: token.address,
          quoteAssetAddress: ethAddress,
          grossBaseQuantity: '0.00000001',
          grossQuoteQuantity: '0.00000002',
          netBaseQuantity: '0.00000001',
          netQuoteQuantity: '0.00000000',
          takerPoolFeeQuantity: '0.00000000',
          takerProtocolFeeQuantity: '0.00000000',
          takerGasFeeQuantity: '0.00000000',
          takerPriceCorrectionFeeQuantity: '0.00000002',
        };
        fill.grossBaseQuantity = new BigNumber(fill.grossBaseQuantity)
          .minus(new BigNumber(poolTrade.grossBaseQuantity))
          .toFixed(8);
        fill.netBaseQuantity = fill.grossBaseQuantity;
        fill.grossQuoteQuantity = new BigNumber(fill.grossQuoteQuantity)
          .minus(new BigNumber(poolTrade.grossQuoteQuantity))
          .toFixed(8);
        fill.netQuoteQuantity = fill.grossQuoteQuantity;

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

      it('should work for taker sell order with price correction greater than gross output', async () => {
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

        const { buyOrder, sellOrder, fill } = await generateOrdersAndFill(
          token.address,
          ethAddress,
          buyWallet,
          sellWallet,
          '1111.11111235',
          '0.00080999',
          ethMarketSymbol,
        );
        sellOrder.price = '0.00080998';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );
        const sellSignature = await getSignature(
          web3,
          getOrderHash(sellOrder),
          sellWallet,
        );
        fill.makerSide = OrderSide.Buy;

        const poolTrade: PoolTrade = {
          baseAssetAddress: token.address,
          quoteAssetAddress: ethAddress,
          grossBaseQuantity: '0.00000001',
          grossQuoteQuantity: '0.00000100',
          netBaseQuantity: '0.00000001',
          netQuoteQuantity: '0.00000000',
          takerPoolFeeQuantity: '0.00000000',
          takerProtocolFeeQuantity: '0.00000000',
          takerGasFeeQuantity: '0.00000000',
          takerPriceCorrectionFeeQuantity: '0.00000101',
        };
        fill.grossBaseQuantity = new BigNumber(fill.grossBaseQuantity)
          .minus(new BigNumber(poolTrade.grossBaseQuantity))
          .toFixed(8);
        fill.netBaseQuantity = fill.grossBaseQuantity;
        fill.grossQuoteQuantity = new BigNumber(fill.grossQuoteQuantity)
          .minus(new BigNumber(poolTrade.grossQuoteQuantity))
          .toFixed(8);
        fill.netQuoteQuantity = fill.grossQuoteQuantity;

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

      it('should revert for quote out with price correction', async () => {
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
          ethAddress,
          buyWallet,
          '2222.22222470',
          '0.00080999',
        );
        buyOrder.quantity = '1111.11111235';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );
        poolTrade.netQuoteQuantity = '1.000000000';
        poolTrade.grossQuoteQuantity = '1.000000000';
        poolTrade.netBaseQuantity = '1111.11111235';
        poolTrade.grossBaseQuantity = '1111.11111235';
        poolTrade.takerPriceCorrectionFeeQuantity = '0.01000000';

        const { sellOrder, fill } = await generateOrdersAndFill(
          token.address,
          ethAddress,
          buyWallet,
          sellWallet,
          '1111.11111235',
          '0.00080999',
          ethMarketSymbol,
        );
        sellOrder.quantity = '2222.22222470';
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
        expect(error.message).to.match(
          /quote out not allowed with price correction/i,
        );
      });

      it('should revert for taker buy with price correction', async () => {
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
        poolTrade.takerPriceCorrectionFeeQuantity = '0.10000000';

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
              '0.01000000',
            ),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/price correction not allowed/i);
      });

      it('should revert for excessive maker fee', async () => {
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
        fill.netQuoteQuantity = '0.50000000';

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
              '0.01000000',
            ),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/excessive maker fee/i);
      });

      it('should revert for unbalanced orderbook base fees', async () => {
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
        fill.netBaseQuantity = '0.50000000';

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
              '0.01000000',
            ),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/orderbook base fees unbalanced/i);
      });

      it('should revert for unbalanced orderbook quote fees', async () => {
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
        fill.netQuoteQuantity = '1.00000000';

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
              '0.01000000',
            ),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/orderbook quote fees unbalanced/i);
      });

      it('should revert for excessive output adjustment', async () => {
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
        poolTrade.netBaseQuantity = new BigNumber(poolTrade.grossBaseQuantity)
          .multipliedBy(new BigNumber('0.1'))
          .toFixed(8);

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
        expect(error.message).to.match(/excessive pool output adjustment/i);
      });

      it('should revert for excessive taker fee', async () => {
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
              new BigNumber(fill.grossBaseQuantity)
                .plus(new BigNumber(poolTrade.grossBaseQuantity))
                .multipliedBy(new BigNumber('0.25'))
                .toFixed(8),
            ),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/excessive taker fee/i);
      });

      it('should revert for taker sell order with excessive price correction', async () => {
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

        const { buyOrder, sellOrder, fill } = await generateOrdersAndFill(
          token.address,
          ethAddress,
          buyWallet,
          sellWallet,
          '1111.11111235',
          '0.00080999',
          ethMarketSymbol,
        );
        sellOrder.price = '0.00080998';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );
        const sellSignature = await getSignature(
          web3,
          getOrderHash(sellOrder),
          sellWallet,
        );
        fill.makerSide = OrderSide.Buy;

        const poolTrade: PoolTrade = {
          baseAssetAddress: token.address,
          quoteAssetAddress: ethAddress,
          grossBaseQuantity: '0.00000001',
          grossQuoteQuantity: '0.00000002',
          netBaseQuantity: '0.00000001',
          netQuoteQuantity: '0.00000000',
          takerPoolFeeQuantity: '0.00000000',
          takerProtocolFeeQuantity: '0.00000000',
          takerGasFeeQuantity: '0.00000000',
          takerPriceCorrectionFeeQuantity: '0.00000003',
        };
        fill.grossBaseQuantity = new BigNumber(fill.grossBaseQuantity)
          .minus(new BigNumber(poolTrade.grossBaseQuantity))
          .toFixed(8);
        fill.netBaseQuantity = fill.grossBaseQuantity;
        fill.grossQuoteQuantity = new BigNumber(fill.grossQuoteQuantity)
          .minus(new BigNumber(poolTrade.grossQuoteQuantity))
          .toFixed(8);
        fill.netQuoteQuantity = fill.grossQuoteQuantity;

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
        expect(error.message).to.match(/excessive price correction/i);
      });

      it('should revert for non-zero pool gas fee', async () => {
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
        poolTrade.takerGasFeeQuantity = '0.01000000';

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
              '0.01000000',
            ),
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/non-zero pool gas fee/i);
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
          ethAddress,
          buyWallet,
          '2222.22222470',
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
        poolTrade.netBaseQuantity = '1111.11111235';
        poolTrade.grossBaseQuantity = '1111.11111235';

        const { sellOrder, fill } = await generateOrdersAndFill(
          token.address,
          ethAddress,
          buyWallet,
          sellWallet,
          '1111.11111235',
          '0.00081000',
          ethMarketSymbol,
        );
        sellOrder.quantity = '2222.22222470';
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
    signatureHashVersion,
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
    takerPriceCorrectionFeeQuantity: '0.00000000',
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
    ethAddress,
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
    ethAddress,
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
    ethAddress,
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
    ethAddress,
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
