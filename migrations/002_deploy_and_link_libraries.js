const Exchange = artifacts.require('Exchange');

const AssetRegistryAdmin = artifacts.require('AssetRegistryAdmin');
const Depositing = artifacts.require('Depositing');
const LiquidityPools = artifacts.require('LiquidityPools');
const Trading = artifacts.require('Trading');
const Withdrawing = artifacts.require('Withdrawing');

module.exports = function (deployer) {
  deployer.deploy(AssetRegistryAdmin);
  deployer.deploy(Depositing);
  deployer.deploy(LiquidityPools);
  deployer.deploy(Trading);
  deployer.deploy(Withdrawing);

  deployer.link(AssetRegistryAdmin, Exchange);
  deployer.link(Depositing, Exchange);
  deployer.link(LiquidityPools, Exchange);
  deployer.link(Trading, Exchange);
  deployer.link(Withdrawing, Exchange);
};
