import BigNumber from 'bignumber.js';
import { MathMockInstance } from '../../types/truffle-contracts';

contract('Math', () => {
  const MathMock = artifacts.require('MathMock');

  describe('sqrt', () => {
    let mock: MathMockInstance;
    beforeEach(async () => {
      mock = await MathMock.new();
    });

    it('should work for small values', async () => {
      expect((await mock.sqrt(0)).toString()).to.equal('0');
      expect((await mock.sqrt(1)).toString()).to.equal('1');
      expect((await mock.sqrt(2)).toString()).to.equal('1');
      expect((await mock.sqrt(3)).toString()).to.equal('1');
    });

    it('should work for max uint64 value', async () => {
      const maxUint64 = new BigNumber(2).pow(64).minus(1);
      expect(
        (
          await mock.sqrt(maxUint64.multipliedBy(maxUint64).toFixed(0))
        ).toString(),
      ).to.equal(maxUint64.toFixed(0));
    });
  });
});
