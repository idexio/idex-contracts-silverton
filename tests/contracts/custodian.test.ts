import BigNumber from 'bignumber.js';

import { ethAddress, nativeAssetSymbol } from '../../lib';
import {
  CustodianInstance,
  ExchangeV31Instance,
  ExchangeWithdrawMockInstance,
  GovernanceInstance,
  GovernanceMockInstance,
} from '../../types/truffle-contracts';

contract('Custodian', (accounts) => {
  const BalanceMigrationSourceMock = artifacts.require(
    'BalanceMigrationSourceMock',
  );

  const Custodian = artifacts.require('Custodian');
  const Exchange = artifacts.require('Exchange_v3_1');
  const Governance = artifacts.require('Governance');
  const GovernanceMock = artifacts.require('GovernanceMock');
  const ExchangeWithdrawMock = artifacts.require('ExchangeWithdrawMock');
  const Token = artifacts.require('TestToken');
  const WETH = artifacts.require('WETH');

  let exchange: ExchangeV31Instance;
  let governance: GovernanceInstance;
  beforeEach(async () => {
    exchange = await Exchange.new(
      (await BalanceMigrationSourceMock.new(0)).address,
      (await WETH.new()).address,
      nativeAssetSymbol,
    );
    governance = await Governance.new();
  });

  describe('deploy', () => {
    it('should work', async () => {
      await Custodian.new(exchange.address, governance.address);
    });

    it('should revert for invalid exchange address', async () => {
      let error;
      try {
        await Custodian.new(ethAddress, governance.address);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid exchange contract address/i);
    });

    it('should revert for non-contract exchange address', async () => {
      let error;
      try {
        await Custodian.new(accounts[0], governance.address);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid exchange contract address/i);
    });

    it('should revert for invalid governance address', async () => {
      let error;
      try {
        await Custodian.new(exchange.address, ethAddress);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid governance contract address/i);
    });

    it('should revert for non-contract governance address', async () => {
      let error;
      try {
        await Custodian.new(exchange.address, accounts[0]);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid governance contract address/i);
    });
  });

  describe('receive', () => {
    let custodian: CustodianInstance;
    let exchangeMock: ExchangeWithdrawMockInstance;
    beforeEach(async () => {
      exchangeMock = await ExchangeWithdrawMock.new();
      custodian = await Custodian.new(exchangeMock.address, governance.address);
      await exchangeMock.setCustodian(custodian.address);
    });

    it('should work when sent from exchange address', async () => {
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: exchangeMock.address,
        value: web3.utils.toWei('1', 'ether'),
      });
    });

    it('should revert when not sent from exchange address', async () => {
      let error;
      try {
        await web3.eth.sendTransaction({
          from: accounts[0],
          to: custodian.address,
          value: web3.utils.toWei('1', 'ether'),
        });
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/caller must be exchange/i);
    });
  });

  describe('withdraw', () => {
    let custodian: CustodianInstance;
    let exchangeMock: ExchangeWithdrawMockInstance;
    beforeEach(async () => {
      exchangeMock = await ExchangeWithdrawMock.new();
      custodian = await Custodian.new(exchangeMock.address, governance.address);
      await exchangeMock.setCustodian(custodian.address);
    });

    it('should work when sent from exchange', async () => {
      const [sourceWallet, destinationWallet] = accounts;
      await web3.eth.sendTransaction({
        from: sourceWallet,
        to: exchangeMock.address,
        value: web3.utils.toWei('1', 'ether'),
      });

      const balanceBefore = await web3.eth.getBalance(destinationWallet);

      await exchangeMock.withdraw(
        destinationWallet,
        ethAddress,
        web3.utils.toWei('1', 'ether'),
      );

      const balanceAfter = await web3.eth.getBalance(destinationWallet);

      expect(
        new BigNumber(balanceAfter)
          .minus(new BigNumber(balanceBefore))
          .toString(),
      ).to.equal(web3.utils.toWei('1', 'ether'));
    });

    it('should revert withdrawing ETH not deposited', async () => {
      const [sourceWallet, destinationWallet] = accounts;

      let error;
      try {
        await exchangeMock.withdraw(
          destinationWallet,
          ethAddress,
          web3.utils.toWei('1', 'ether'),
          { from: sourceWallet },
        );
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/ETH transfer failed/i);
    });

    it('should revert withdrawing tokens not deposited', async () => {
      const [sourceWallet, destinationWallet] = accounts;
      const token = await Token.new();

      let error;
      try {
        await exchangeMock.withdraw(
          destinationWallet,
          token.address,
          web3.utils.toWei('1', 'ether'),
          { from: sourceWallet },
        );
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/transfer amount exceeds balance/i);
    });

    it('should revert when not sent from exchange', async () => {
      const [sourceWallet, destinationWallet] = accounts;

      let error;
      try {
        await custodian.withdraw(
          destinationWallet,
          ethAddress,
          web3.utils.toWei('1', 'ether'),
          { from: sourceWallet },
        );
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/caller must be exchange/i);
    });
  });
});
