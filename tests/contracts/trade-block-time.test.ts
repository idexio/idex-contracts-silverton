import { v1 as uuidv1 } from 'uuid';

import { ethAddress } from '../../lib';
import {
  deployAndAssociateContracts,
  deployAndRegisterToken,
  increaseBlockTimestamp,
} from './helpers';
import {
  deposit,
  executeOrderBookTrade,
  generateOrdersAndFill,
} from './trade.test';

const tokenSymbol = 'TKN';

// These tests advance the block timestamp to test the nonce-timestamp filtering for the asset
// registry. Changing the block timestamp causes side effects for other tests that don't specifically
// handle it, so isolate these tests here
contract('Exchange (trades)', (accounts) => {
  describe('executeOrderBookTrade', () => {
    it('should revert when buy order base asset is mismatched with trade', async () => {
      const { exchange } = await deployAndAssociateContracts();
      await deployAndRegisterToken(exchange, tokenSymbol);
      const oldTimestampMs =
        ((await web3.eth.getBlock('latest')).timestamp as number) * 1000;
      await increaseBlockTimestamp();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);
      const newTimestampMs =
        ((await web3.eth.getBlock('latest')).timestamp as number) * 1000;
      await exchange.setDispatcher(accounts[0]);
      const [sellWallet, buyWallet] = accounts;
      await deposit(exchange, token, buyWallet, sellWallet);

      const { buyOrder, sellOrder, fill } = await generateOrdersAndFill(
        token.address,
        ethAddress,
        buyWallet,
        sellWallet,
      );
      buyOrder.nonce = uuidv1({ msecs: oldTimestampMs });
      sellOrder.nonce = uuidv1({ msecs: newTimestampMs });

      let error;
      try {
        await executeOrderBookTrade(
          exchange,
          buyWallet,
          sellWallet,
          buyOrder,
          sellOrder,
          fill,
        );
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/order symbol address mismatch/i);
    });

    it('should revert when sell order base asset is mismatched with trade', async () => {
      const { exchange } = await deployAndAssociateContracts();
      await deployAndRegisterToken(exchange, tokenSymbol);
      const oldTimestampMs =
        ((await web3.eth.getBlock('latest')).timestamp as number) * 1000;
      await increaseBlockTimestamp();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);
      const newTimestampMs =
        ((await web3.eth.getBlock('latest')).timestamp as number) * 1000;
      await exchange.setDispatcher(accounts[0]);
      const [sellWallet, buyWallet] = accounts;
      await deposit(exchange, token, buyWallet, sellWallet);

      const { buyOrder, sellOrder, fill } = await generateOrdersAndFill(
        token.address,
        ethAddress,
        buyWallet,
        sellWallet,
      );
      buyOrder.nonce = uuidv1({ msecs: newTimestampMs });
      sellOrder.nonce = uuidv1({ msecs: oldTimestampMs });

      let error;
      try {
        await executeOrderBookTrade(
          exchange,
          buyWallet,
          sellWallet,
          buyOrder,
          sellOrder,
          fill,
        );
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/order symbol address mismatch/i);
    });
  });
});
