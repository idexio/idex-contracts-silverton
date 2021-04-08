const Exchange = artifacts.require('Exchange');
const HybridTrade = artifacts.require('HybridTrade');

module.exports = function (deployer) {
  deployer.deploy(HybridTrade);
  deployer.link(HybridTrade, Exchange);
};
