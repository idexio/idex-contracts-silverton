const Exchange = artifacts.require('Exchange');

const AssetRegistryAdmin = artifacts.require('AssetRegistryAdmin');
const Depositing = artifacts.require('Depositing');
const LiquidityPoolRegistry = artifacts.require('LiquidityPoolRegistry');
const Trading = artifacts.require('Trading');
const Withdrawing = artifacts.require('Withdrawing');

module.exports = function (deployer) {
  deployer.deploy(AssetRegistryAdmin);
  deployer.deploy(Depositing);
  deployer.deploy(LiquidityPoolRegistry);
  deployer.deploy(Trading);
  deployer.deploy(Withdrawing);

  deployer.link(AssetRegistryAdmin, Exchange);
  deployer.link(Depositing, Exchange);
  deployer.link(LiquidityPoolRegistry, Exchange);
  deployer.link(Trading, Exchange);
  deployer.link(Withdrawing, Exchange);
};
