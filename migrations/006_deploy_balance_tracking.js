const Exchange = artifacts.require('Exchange');
const BalanceTracking = artifacts.require('BalanceTracking');

module.exports = function (deployer) {
  deployer.deploy(BalanceTracking);
  deployer.link(BalanceTracking, Exchange);
};
