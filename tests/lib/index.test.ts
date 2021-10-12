import { expect } from 'chai';

import { assetUnitsToPips } from '../../lib';

describe('assetUnitsToPips', () => {
  it('should work', async () => {
    expect(assetUnitsToPips('100', 2)).to.equal('100000000');
    expect(
      assetUnitsToPips('1000000000000000000000000000000000000000000', 18),
    ).to.equal('100000000000000000000000000000000');
  });
});
