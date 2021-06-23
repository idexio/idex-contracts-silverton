import {
  CustodianInstance,
  ExchangeLPTokenMockInstance,
  GovernanceInstance,
} from '../../types/truffle-contracts';

import { ethAddress } from '../../lib';

contract(
  'Exchange (liquidity provider token)',
  ([ownerWallet, anotherWallet]) => {
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
      it('should revert for zero Custodian address', async () => {
        const token = await Token.new();
        await exchangeMock.setCustodian(ethAddress);

        let error;
        try {
          await exchangeMock.createLiquidityProviderToken(
            token.address,
            ethAddress,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/revert/i);
      });
    });

    describe('initialize', () => {
      it('should work', async () => {
        const token = await Token.new();

        const lpToken = await LiquidityProviderToken.at(
          (
            await exchangeMock.createLiquidityProviderToken(
              token.address,
              ethAddress,
            )
          ).logs[0].args.lpToken,
        );

        expect(await lpToken.name()).to.equal('IDEX LPs');
        expect(await lpToken.symbol()).to.equal('IDEX-LP');
        expect((await lpToken.decimals()).toString()).to.equal('18');
      });

      it('should revert when not called by exchange', async () => {
        const token = await Token.new();

        const lpToken = await LiquidityProviderToken.at(
          (
            await exchangeMock.createLiquidityProviderToken(
              token.address,
              ethAddress,
            )
          ).logs[0].args.lpToken,
        );

        let error;
        try {
          await lpToken.initialize(token.address, ethAddress);
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/caller is not exchange/i);
      });

      it('should revert when base and quote address are the same', async () => {
        let error;
        try {
          await exchangeMock.createLiquidityProviderToken(
            ethAddress,
            ethAddress,
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
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/invalid quote asset/i);
      });
    });

    describe('transfer', () => {
      it('should work', async () => {
        const token = await Token.new();
        const lpToken = await LiquidityProviderToken.at(
          (
            await exchangeMock.createLiquidityProviderToken(
              token.address,
              ethAddress,
            )
          ).logs[0].args.lpToken,
        );
        await exchangeMock.mint(
          lpToken.address,
          ownerWallet,
          '1000',
          '1000',
          '1000',
          ownerWallet,
        );

        await lpToken.transfer(anotherWallet, '1000');
      });

      it('should revert when sending more than balance', async () => {
        const token = await Token.new();
        const lpToken = await LiquidityProviderToken.at(
          (
            await exchangeMock.createLiquidityProviderToken(
              token.address,
              ethAddress,
            )
          ).logs[0].args.lpToken,
        );

        let error;
        try {
          await lpToken.transfer(anotherWallet, '1000');
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/transfer amount exceeds balance/i);
      });

      it('should revert when sending to zero address', async () => {
        const token = await Token.new();
        const lpToken = await LiquidityProviderToken.at(
          (
            await exchangeMock.createLiquidityProviderToken(
              token.address,
              ethAddress,
            )
          ).logs[0].args.lpToken,
        );
        await exchangeMock.mint(
          lpToken.address,
          ownerWallet,
          '1000',
          '1000',
          '1000',
          ownerWallet,
        );

        let error;
        try {
          await lpToken.transfer(ethAddress, '1000');
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/transfer to the zero address/i);
      });
    });

    describe('burn', () => {
      it('should revert when burning more than balance', async () => {
        const token = await Token.new();
        const lpToken = await LiquidityProviderToken.at(
          (
            await exchangeMock.createLiquidityProviderToken(
              token.address,
              ethAddress,
            )
          ).logs[0].args.lpToken,
        );

        let error;
        try {
          await exchangeMock.burn(
            lpToken.address,
            ownerWallet,
            '1000',
            '1000',
            '1000',
            ownerWallet,
          );
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/burn amount exceeds balance/i);
      });
    });

    describe('approve', () => {
      it('should work', async () => {
        const token = await Token.new();
        const lpToken = await LiquidityProviderToken.at(
          (
            await exchangeMock.createLiquidityProviderToken(
              token.address,
              ethAddress,
            )
          ).logs[0].args.lpToken,
        );
        await exchangeMock.mint(
          lpToken.address,
          ownerWallet,
          '1000',
          '1000',
          '1000',
          ownerWallet,
        );

        await lpToken.approve(anotherWallet, '100');
        expect(
          (await lpToken.allowance(ownerWallet, anotherWallet)).toString(),
        ).to.equal('100');

        await lpToken.increaseAllowance(anotherWallet, '100');
        expect(
          (await lpToken.allowance(ownerWallet, anotherWallet)).toString(),
        ).to.equal('200');

        await lpToken.decreaseAllowance(anotherWallet, '100');
        expect(
          (await lpToken.allowance(ownerWallet, anotherWallet)).toString(),
        ).to.equal('100');

        let error;
        try {
          await lpToken.decreaseAllowance(anotherWallet, '1000');
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/decreased allowance below zero/i);
      });

      it('should revert when approving zero address', async () => {
        const token = await Token.new();
        const lpToken = await LiquidityProviderToken.at(
          (
            await exchangeMock.createLiquidityProviderToken(
              token.address,
              ethAddress,
            )
          ).logs[0].args.lpToken,
        );

        let error;
        try {
          await lpToken.approve(ethAddress, '1000');
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.match(/approve to the zero address/i);
      });
    });
  },
);
