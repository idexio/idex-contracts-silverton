contract('Math', () => {
  const MathMock = artifacts.require('MathMock');

  describe('sqrt', () => {
    it('should work for small values', async () => {
      const mock = await MathMock.new();
      expect((await mock.sqrt(0)).toString()).to.equal('0');
      expect((await mock.sqrt(1)).toString()).to.equal('1');
      expect((await mock.sqrt(2)).toString()).to.equal('1');
      expect((await mock.sqrt(3)).toString()).to.equal('1');
    });
  });
});
