contract('Governance', () => {
  const Governance = artifacts.require('Governance');

  it('should deploy', async () => {
    await Governance.new();
  });
});
