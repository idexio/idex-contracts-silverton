import { deployAndAssociateContracts, ethSymbol } from './helpers';

contract('Exchange (tunable parameters)', (accounts) => {
  const BalanceMigrationSourceMock = artifacts.require(
    'BalanceMigrationSourceMock',
  );
  const Exchange = artifacts.require('Exchange');
  const WETH = artifacts.require('WETH');

  const bnbAddress = web3.utils.bytesToHex([...Buffer.alloc(20)]);

  describe('constructor', () => {
    it('should work', async () => {
      await Exchange.new(
        (await BalanceMigrationSourceMock.new()).address,
        (await WETH.new()).address,
      );
    });

    it('should revert for invalid balance migration source', async () => {
      let error;
      try {
        await Exchange.new(bnbAddress, (await WETH.new()).address);
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid migration source/i);
    });

    it('should revert for invalid WETH address', async () => {
      let error;
      try {
        await Exchange.new(
          (await BalanceMigrationSourceMock.new()).address,
          bnbAddress,
        );
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid WETH address/i);
    });
  });

  it('should revert when receiving ETH directly', async () => {
    const exchange = await Exchange.new(
      (await BalanceMigrationSourceMock.new()).address,
      (await WETH.new()).address,
    );

    let error;
    try {
      await web3.eth.sendTransaction({
        to: exchange.address,
        from: accounts[0],
        value: web3.utils.toWei('1', 'ether'),
      });
    } catch (e) {
      error = e;
    }

    expect(error).to.not.be.undefined;
    expect(error.message).to.match(/revert/i);
  });

  describe('loadBalanceInAssetUnitsByAddress', () => {
    it('should revert for invalid wallet', async () => {
      const { exchange } = await deployAndAssociateContracts();

      let error;
      try {
        await exchange.loadBalanceInAssetUnitsByAddress(bnbAddress, bnbAddress);
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid wallet address/i);
    });
  });

  describe('loadBalanceInPipsByAddress', () => {
    it('should revert for invalid wallet', async () => {
      const { exchange } = await deployAndAssociateContracts();

      let error;
      try {
        await exchange.loadBalanceInPipsByAddress(bnbAddress, bnbAddress);
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid wallet address/i);
    });
  });

  describe('loadBalanceInPipsBySymbol', () => {
    it('should revert for invalid wallet', async () => {
      const { exchange } = await deployAndAssociateContracts();

      let error;
      try {
        await exchange.loadBalanceInPipsBySymbol(bnbAddress, ethSymbol);
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid wallet address/i);
    });
  });

  describe('loadBalanceInAssetUnitsBySymbol', () => {
    it('should revert for invalid wallet', async () => {
      const { exchange } = await deployAndAssociateContracts();

      let error;
      try {
        await exchange.loadBalanceInAssetUnitsBySymbol(bnbAddress, ethSymbol);
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid wallet address/i);
    });
  });

  describe('loadPairFactoryContractAddress', () => {
    it('should work', async () => {
      const { exchange } = await deployAndAssociateContracts();

      const { address } = await WETH.new();
      await exchange.setPairFactoryAddress(address);

      const result = await exchange.loadPairFactoryContractAddress();
      expect(result).to.equal(address);
    });
  });

  describe('loadWETHAddress', () => {
    it('should work', async () => {
      const { address } = await WETH.new();
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new()).address,
        address,
      );

      const result = await exchange.loadWETHAddress();
      expect(result).to.equal(address);
    });
  });

  describe('setAdmin', async () => {
    it('should work for valid address', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new()).address,
        (await WETH.new()).address,
      );

      await exchange.setAdmin(accounts[1]);
    });

    it('should revert for empty address', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new()).address,
        (await WETH.new()).address,
      );

      let error;
      try {
        await exchange.setAdmin(bnbAddress);
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid wallet address/i);
    });

    it('should revert for setting same address as current', async () => {
      const { exchange } = await deployAndAssociateContracts();
      await exchange.setAdmin(accounts[1]);

      let error;
      try {
        await exchange.setAdmin(accounts[1]);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/must be different/i);
    });

    it('should revert when not called by owner', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new()).address,
        (await WETH.new()).address,
      );

      let error;
      try {
        await exchange.setAdmin(accounts[1], { from: accounts[1] });
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/caller must be owner/i);
    });
  });

  describe('setPairFactoryAddress', async () => {
    it('should work for valid address', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new()).address,
        (await WETH.new()).address,
      );

      await exchange.setPairFactoryAddress((await WETH.new()).address);
    });

    it('should revert for empty address', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new()).address,
        (await WETH.new()).address,
      );

      let error;
      try {
        await exchange.setPairFactoryAddress(bnbAddress);
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid address/i);
    });

    it('should revert when called more than once', async () => {
      const { exchange } = await deployAndAssociateContracts();
      await exchange.setPairFactoryAddress((await WETH.new()).address);

      let error;
      try {
        await exchange.setPairFactoryAddress((await WETH.new()).address);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/factory can only be set once/i);
    });

    it('should revert when not called by admin', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new()).address,
        (await WETH.new()).address,
      );

      let error;
      try {
        await exchange.setPairFactoryAddress(accounts[1], {
          from: accounts[1],
        });
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/caller must be admin/i);
    });
  });

  describe('removeAdmin', async () => {
    it('should work', async () => {
      const { exchange } = await deployAndAssociateContracts();

      await exchange.removeAdmin();
    });
  });

  describe('setCustodian', () => {
    it('should work for valid address', async () => {
      await deployAndAssociateContracts();
    });

    it('should revert for empty address', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new()).address,
        (await WETH.new()).address,
      );

      let error;
      try {
        await exchange.setCustodian(bnbAddress);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid address/i);
    });

    it('should revert after first call', async () => {
      const { custodian, exchange } = await deployAndAssociateContracts();

      let error;
      try {
        await exchange.setCustodian(custodian.address);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/custodian can only be set once/i);
    });
  });

  describe('setChainPropagationPeriod', () => {
    it('should work for value in bounds', async () => {
      const { exchange } = await deployAndAssociateContracts();

      await exchange.setChainPropagationPeriod('10');

      const events = await exchange.getPastEvents(
        'ChainPropagationPeriodChanged',
        {
          fromBlock: 0,
        },
      );
      expect(events).to.be.an('array');
      expect(events.length).to.equal(1);
    });

    it('should revert for value out of bounds', async () => {
      const { exchange } = await deployAndAssociateContracts();

      let error;
      try {
        await exchange.setChainPropagationPeriod('1000000000000000000000000');
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/must be less than/i);
    });
  });

  describe('setDispatcher', () => {
    it('should work for valid address', async () => {
      const { exchange } = await deployAndAssociateContracts();

      await exchange.setDispatcher(accounts[1]);

      const events = await exchange.getPastEvents('DispatcherChanged', {
        fromBlock: 0,
      });
      expect(events).to.be.an('array');
      expect(events.length).to.equal(1);
    });

    it('should revert for empty address', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new()).address,
        (await WETH.new()).address,
      );

      let error;
      try {
        await exchange.setDispatcher(bnbAddress);
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid wallet address/i);
    });

    it('should revert for setting same address as current', async () => {
      const { exchange } = await deployAndAssociateContracts();
      await exchange.setDispatcher(accounts[1]);

      let error;
      try {
        await exchange.setDispatcher(accounts[1]);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/must be different/i);
    });
  });

  describe('removeDispatcher', () => {
    it('should set wallet to zero', async () => {
      const { exchange } = await deployAndAssociateContracts();

      await exchange.setDispatcher(accounts[1]);
      await exchange.removeDispatcher();

      const events = await exchange.getPastEvents('DispatcherChanged', {
        fromBlock: 0,
      });
      expect(events).to.be.an('array');
      expect(events.length).to.equal(2);
      expect(events[1].returnValues.newValue).to.equal(bnbAddress);
    });
  });

  describe('setFeeWallet', () => {
    it('should work for valid address', async () => {
      const { exchange } = await deployAndAssociateContracts();

      await exchange.setFeeWallet(accounts[1]);

      const events = await exchange.getPastEvents('FeeWalletChanged', {
        fromBlock: 0,
      });
      expect(events).to.be.an('array');
      expect(events.length).to.equal(1);

      expect(await exchange.loadFeeWallet()).to.equal(accounts[1]);
    });

    it('should revert for empty address', async () => {
      const exchange = await Exchange.new(
        (await BalanceMigrationSourceMock.new()).address,
        (await WETH.new()).address,
      );

      let error;
      try {
        await exchange.setFeeWallet(bnbAddress);
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid wallet address/i);
    });

    it('should revert for setting same address as current', async () => {
      const { exchange } = await deployAndAssociateContracts();
      await exchange.setFeeWallet(accounts[1]);

      let error;
      try {
        await exchange.setFeeWallet(accounts[1]);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/must be different/i);
    });
  });
});
