import BigNumber from 'bignumber.js';
import { FaucetTokenInstance } from '../../types/truffle-contracts';

contract('FaucetToken', () => {
  const FaucetToken = artifacts.require('FaucetToken');

  describe('faucet', () => {
    it('should work', async () => {
      const faucetToken = await FaucetToken.new('Test', 'TEST', 18, 100);

      const name = await faucetToken.name();
      expect(name).to.equal('Test');

      const symbol = await faucetToken.symbol();
      expect(symbol).to.equal('TEST');

      const decimals = await faucetToken.decimals();
      expect(decimals.toString()).to.equal('18');

      await faucetToken.faucet('0xC26880A0AF2EA0c7E8130e6EC47Af756465452E8');
    });

    it('should revert for zero address', async () => {
      const faucetToken = await FaucetToken.new('Test', 'TEST', 18, 100);

      let error;
      try {
        await faucetToken.faucet('0x0000000000000000000000000000000000000000');
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/invalid wallet/i);
    });

    it('should revert after max supply', async () => {
      const faucetToken = await FaucetToken.new(
        'Test',
        'TEST',
        18,
        '1000000000000000',
      );

      await faucetToken.faucet('0xC26880A0AF2EA0c7E8130e6EC47Af756465452E8');

      let error;
      try {
        await faucetToken.faucet('0xC26880A0AF2EA0c7E8130e6EC47Af756465452E8');
      } catch (e) {
        error = e;
      }

      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/max supply exceeded/i);
    });
  });
});
