import { BigNumber } from 'ethers';
import {
  deployAndAssociateContracts,
  deployAndRegisterToken,
  minimumTokenQuantity,
} from './helpers';
import { assetUnitsToPips, ethAddress, nativeAssetSymbol } from '../../lib';

contract('Exchange (deposits)', (accounts) => {
  const BalanceMigrationSourceMock = artifacts.require(
    'BalanceMigrationSourceMock',
  );
  const Exchange = artifacts.require('Exchange_v3_1');
  const NonCompliantToken = artifacts.require('NonCompliantToken');
  const SkimmingToken = artifacts.require('SkimmingTestToken');
  const Token = artifacts.require('TestToken');
  const WETH = artifacts.require('WETH');

  const tokenSymbol = 'TKN';

  it('should revert when receiving ETH directly', async () => {
    const exchange = await Exchange.new(
      (await BalanceMigrationSourceMock.new(0)).address,
      (await WETH.new()).address,
      nativeAssetSymbol,
    );

    let error;
    try {
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: exchange.address,
        value: web3.utils.toWei('1', 'ether'),
      });
    } catch (e) {
      error = e;
    }
    expect(error).to.not.be.undefined;
    expect(error.message).to.match(/revert/i);
  });

  it('should migrate balance on deposit', async () => {
    const {
      balanceMigrationSource,
      exchange,
    } = await deployAndAssociateContracts();
    await balanceMigrationSource.setBalanceInPipsByAddress(
      accounts[0],
      ethAddress,
      assetUnitsToPips(minimumTokenQuantity, 18),
    );

    await exchange.depositEther({
      value: minimumTokenQuantity,
      from: accounts[0],
    });

    const events = await exchange.getPastEvents('Deposited', {
      fromBlock: 0,
    });
    expect(events).to.be.an('array');
    expect(events.length).to.equal(1);

    const { wallet, assetAddress, assetSymbol } = events[0].returnValues;

    expect(wallet).to.equal(accounts[0]);
    expect(assetAddress).to.equal(ethAddress);
    expect(assetSymbol).to.equal(nativeAssetSymbol);

    const expectedQuantity = BigNumber.from(minimumTokenQuantity)
      .mul(2)
      .toString();
    expect(
      (
        await exchange.loadBalanceInAssetUnitsByAddress(accounts[0], ethAddress)
      ).toString(),
    ).to.equal(expectedQuantity);
    expect(
      (
        await exchange.loadBalanceInPipsByAddress(accounts[0], ethAddress)
      ).toString(),
    ).to.equal(assetUnitsToPips(expectedQuantity, 18));
    expect(
      (
        await exchange.loadBalanceInAssetUnitsBySymbol(
          accounts[0],
          nativeAssetSymbol,
        )
      ).toString(),
    ).to.equal(expectedQuantity);
    expect(
      (
        await exchange.loadBalanceInPipsBySymbol(accounts[0], nativeAssetSymbol)
      ).toString(),
    ).to.equal(assetUnitsToPips(expectedQuantity, 18));
  });

  describe('setDepositIndex', () => {
    it('should work', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new(33)).address,
        (await WETH.new()).address,
        nativeAssetSymbol,
      );

      await exchange.setDepositIndex();

      expect((await exchange._depositIndex()).toString()).to.equal('33');
    });

    it('should work with no migration source', async () => {
      const exchange = await Exchange.new(
        '0x0000000000000000000000000000000000000000',
        (await WETH.new()).address,
        nativeAssetSymbol,
      );

      await exchange.setDepositIndex();

      expect((await exchange._depositIndex()).toString()).to.equal('0');
    });

    it('revert when called twice', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new(0)).address,
        (await WETH.new()).address,
        nativeAssetSymbol,
      );

      await exchange.setDepositIndex();

      let error;
      try {
        await exchange.setDepositIndex();
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/can only be set once/i);
    });
  });

  // TODO Verify balances
  describe('depositEther', () => {
    it('should work for minimum quantity', async () => {
      const { exchange } = await deployAndAssociateContracts();

      await exchange.depositEther({
        value: minimumTokenQuantity,
        from: accounts[0],
      });

      const events = await exchange.getPastEvents('Deposited', {
        fromBlock: 0,
      });
      expect(events).to.be.an('array');
      expect(events.length).to.equal(1);

      const { wallet, assetAddress, assetSymbol } = events[0].returnValues;

      expect(wallet).to.equal(accounts[0]);
      expect(assetAddress).to.equal(ethAddress);
      expect(assetSymbol).to.equal(nativeAssetSymbol);

      expect(
        (
          await exchange.loadBalanceInAssetUnitsByAddress(
            accounts[0],
            ethAddress,
          )
        ).toString(),
      ).to.equal(minimumTokenQuantity);
      expect(
        (
          await exchange.loadBalanceInPipsByAddress(accounts[0], ethAddress)
        ).toString(),
      ).to.equal(assetUnitsToPips(minimumTokenQuantity, 18));
      expect(
        (
          await exchange.loadBalanceInAssetUnitsBySymbol(
            accounts[0],
            nativeAssetSymbol,
          )
        ).toString(),
      ).to.equal(minimumTokenQuantity);
      expect(
        (
          await exchange.loadBalanceInPipsBySymbol(
            accounts[0],
            nativeAssetSymbol,
          )
        ).toString(),
      ).to.equal(assetUnitsToPips(minimumTokenQuantity, 18));
    });

    it('should revert below minimum quantity', async () => {
      const { exchange } = await deployAndAssociateContracts();

      let error;
      try {
        await exchange.depositEther({
          value: (BigInt(minimumTokenQuantity) - BigInt(1)).toString(),
          from: accounts[0],
        });
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/Quantity is too low/i);
    });

    it('should revert when depositIndex is unset', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new(0)).address,
        (await WETH.new()).address,
        nativeAssetSymbol,
      );

      let error;
      try {
        await exchange.depositEther({
          value: (BigInt(minimumTokenQuantity) - BigInt(1)).toString(),
          from: accounts[0],
        });
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/deposits disabled/i);
    });
  });

  describe('depositTokenBySymbol', () => {
    it('should work for minimum quantity', async () => {
      const { exchange } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);

      await token.approve(exchange.address, minimumTokenQuantity);
      await exchange.depositTokenBySymbol(tokenSymbol, minimumTokenQuantity);

      const events = await exchange.getPastEvents('Deposited', {
        fromBlock: 0,
      });
      expect(events).to.be.an('array');
      expect(events.length).to.equal(1);

      const { wallet, assetAddress, assetSymbol } = events[0].returnValues;

      expect(wallet).to.equal(accounts[0]);
      expect(assetAddress).to.equal(token.address);
      expect(assetSymbol).to.equal(tokenSymbol);
    });

    it('should revert for ETH', async () => {
      const { exchange } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);

      let error;
      try {
        await token.approve(exchange.address, minimumTokenQuantity);
        await exchange.depositTokenBySymbol('BNB', minimumTokenQuantity);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/use depositEther/i);
    });

    it('should revert for exited wallet', async () => {
      const { exchange } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);
      await token.approve(exchange.address, minimumTokenQuantity);
      await exchange.exitWallet();

      let error;
      try {
        await exchange.depositTokenBySymbol(tokenSymbol, minimumTokenQuantity);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/wallet exited/i);
    });

    it('should revert when token quantity above wallet balance', async () => {
      const { exchange } = await deployAndAssociateContracts();
      await deployAndRegisterToken(exchange, tokenSymbol);
      const [, wallet] = accounts;

      let error;
      try {
        await exchange.depositTokenBySymbol(tokenSymbol, minimumTokenQuantity, {
          from: wallet,
        });
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/transfer amount exceeds balance/i);
    });

    it('should revert for unknown token', async () => {
      const { exchange } = await deployAndAssociateContracts();
      const [, wallet] = accounts;

      let error;
      try {
        await exchange.depositTokenBySymbol(tokenSymbol, minimumTokenQuantity, {
          from: wallet,
        });
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/no confirmed asset found for symbol/i);
    });
  });

  describe('depositTokenByAddress', () => {
    it('should work for minimum quantity', async () => {
      const { exchange } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);

      await token.approve(exchange.address, minimumTokenQuantity);
      await exchange.depositTokenByAddress(token.address, minimumTokenQuantity);

      const events = await exchange.getPastEvents('Deposited', {
        fromBlock: 0,
      });
      expect(events).to.be.an('array');
      expect(events.length).to.equal(1);
    });

    it('should work for minimum quantity with non-compliant token', async () => {
      const { exchange } = await deployAndAssociateContracts();
      const token = await NonCompliantToken.new();

      await exchange.registerToken(token.address, tokenSymbol, 18);
      await exchange.confirmTokenRegistration(token.address, tokenSymbol, 18);
      await token.approve(exchange.address, minimumTokenQuantity);
      await exchange.depositTokenByAddress(token.address, minimumTokenQuantity);

      const events = await exchange.getPastEvents('Deposited', {
        fromBlock: 0,
      });
      expect(events).to.be.an('array');
      expect(events.length).to.equal(1);
    });

    it('should revert for ETH', async () => {
      const { exchange } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, tokenSymbol);

      let error;
      try {
        await token.approve(exchange.address, minimumTokenQuantity);
        await exchange.depositTokenByAddress(ethAddress, minimumTokenQuantity);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/use depositEther/i);
    });

    it('should revert for unknown token', async () => {
      const { exchange } = await deployAndAssociateContracts();
      const token = await Token.new();
      const [, wallet] = accounts;

      let error;
      try {
        await exchange.depositTokenByAddress(
          token.address,
          minimumTokenQuantity,
          {
            from: wallet,
          },
        );
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/no confirmed asset found for address/i);
    });

    it('should revert when token skims from transfer', async () => {
      const { exchange } = await deployAndAssociateContracts();
      const token = await SkimmingToken.new();
      await token.setShouldSkim(true);
      await exchange.registerToken(token.address, tokenSymbol, 18);
      await exchange.confirmTokenRegistration(token.address, tokenSymbol, 18);
      await token.approve(exchange.address, minimumTokenQuantity);

      let error;
      try {
        await exchange.depositTokenByAddress(
          token.address,
          minimumTokenQuantity,
        );
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(
        /transferFrom success without expected balance change/i,
      );
    });
  });
});
