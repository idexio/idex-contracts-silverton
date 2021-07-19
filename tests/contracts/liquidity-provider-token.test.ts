import {
  CustodianInstance,
  ExchangeLPTokenMockInstance,
  GovernanceInstance,
} from '../../types/truffle-contracts';

import { ethAddress } from '../../lib';

contract('Exchange (liquidity provider token)', ([ownerWallet]) => {
  const Custodian = artifacts.require('Custodian');
  const ExchangeLPTokenMock = artifacts.require('ExchangeLPTokenMock');
  const Governance = artifacts.require('Governance');
  const LiquidityProviderToken = artifacts.require('LiquidityProviderToken');
  const Token = artifacts.require('TestToken');

  let custodian: CustodianInstance;
  let exchangeMock: ExchangeLPTokenMockInstance;
  let governance: GovernanceInstance;
  beforeEach(async () => {
    governance = await Governance.new(10);
    exchangeMock = await ExchangeLPTokenMock.new();
    custodian = await Custodian.new(exchangeMock.address, governance.address);
    await exchangeMock.setCustodian(custodian.address);
  });

  describe('constructor', () => {
    it('should work', async () => {
      const token = await Token.new();

      const lpToken = await LiquidityProviderToken.at(
        (
          await exchangeMock.createLiquidityProviderToken(
            token.address,
            ethAddress,
            'DIL',
            'ETH',
          )
        ).logs[0].args.lpToken,
      );

      expect(await lpToken.name()).to.equal('IDEX LP: DIL-ETH');
      expect((await lpToken.decimals()).toString()).to.equal('18');

      expect(await lpToken.baseAssetAddress()).to.equal(token.address);
      expect(await lpToken.quoteAssetAddress()).to.equal(ethAddress);

      const [expectedToken0, expectedToken1] = [
        token.address,
        ethAddress,
      ].sort();
      expect(await lpToken.token0()).to.equal(expectedToken0);
      expect(await lpToken.token1()).to.equal(expectedToken1);
    });

    it('should revert for zero Custodian address', async () => {
      const token = await Token.new();
      await exchangeMock.setCustodian(ethAddress);

      let error;
      try {
        await exchangeMock.createLiquidityProviderToken(
          token.address,
          ethAddress,
          'DIL',
          'ETH',
        );
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/revert/i);
    });

    it('should revert when base and quote address are the same', async () => {
      let error;
      try {
        await exchangeMock.createLiquidityProviderToken(
          ethAddress,
          ethAddress,
          'DIL',
          'ETH',
        );
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/assets must be different/i);
    });

    it('should revert when base is not ETH or a contract', async () => {
      let error;
      try {
        await exchangeMock.createLiquidityProviderToken(
          ownerWallet,
          ethAddress,
          'DIL',
          'ETH',
        );
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid base asset/i);
    });

    it('should revert when quote is not ETH or a contract', async () => {
      let error;
      try {
        await exchangeMock.createLiquidityProviderToken(
          ethAddress,
          ownerWallet,
          'DIL',
          'ETH',
        );
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid quote asset/i);
    });
  });

  describe('onlyExchange', () => {
    it('should restrict burn, mint, and reverseAssets', async () => {
      const token = await Token.new();

      const lpToken = await LiquidityProviderToken.at(
        (
          await exchangeMock.createLiquidityProviderToken(
            token.address,
            ethAddress,
            'DIL',
            'ETH',
          )
        ).logs[0].args.lpToken,
      );
      let error;

      try {
        await lpToken.burn(ownerWallet, 0, 0, 0, ownerWallet);
      } catch (e) {
        error = e;
      }
      expect(error.message).to.match(/caller is not exchange/i);

      try {
        await lpToken.mint(ownerWallet, 0, 0, 0, ownerWallet);
      } catch (e) {
        error = e;
      }
      expect(error.message).to.match(/caller is not exchange/i);

      try {
        await lpToken.reverseAssets();
      } catch (e) {
        error = e;
      }
      expect(error.message).to.match(/caller is not exchange/i);
    });
  });
});
