const Exchange = artifacts.require('Exchange');
const LiquidityPoolRegistry = artifacts.require('LiquidityPoolRegistry');

module.exports = function (deployer) {
  deployer.deploy(LiquidityPoolRegistry);
  deployer.link(LiquidityPoolRegistry, Exchange);
};
