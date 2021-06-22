import { ethAddress } from '../../lib';
import { deployAndAssociateContracts, deployAndRegisterToken } from './helpers';
import { getLpToken, token0Symbol } from './liquidity-pools.test';

contract('Exchange (liquidity provider token)', ([ownerWallet]) => {
  describe('initialize', () => {
    it('should revert when not called by exchange', async () => {
      const { exchange } = await deployAndAssociateContracts();
      const token = await deployAndRegisterToken(exchange, token0Symbol);

      await exchange.createLiquidityPool(token.address, ethAddress);
      const lpToken = await getLpToken(exchange, token.address, ethAddress);

      let error;
      try {
        await lpToken.initialize(token.address, ethAddress);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.match(/caller is not exchange/i);
    });
  });
});
