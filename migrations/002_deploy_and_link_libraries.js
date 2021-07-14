const Exchange = artifacts.require('Exchange');

const AssetRegistry = artifacts.require('AssetRegistry');
const Depositing = artifacts.require('Depositing');
const LiquidityPoolAdmin = artifacts.require('LiquidityPoolAdmin');
const LiquidityPools = artifacts.require('LiquidityPools');
const Trading = artifacts.require('Trading');
const Withdrawing = artifacts.require('Withdrawing');

module.exports = function (deployer) {
  deployer.deploy(AssetRegistry);
  deployer.deploy(Depositing);
  deployer.deploy(LiquidityPoolAdmin);
  deployer.deploy(LiquidityPools);
  deployer.deploy(Trading);
  deployer.deploy(Withdrawing);

  deployer.link(AssetRegistry, Exchange);
  deployer.link(Depositing, Exchange);
  deployer.link(LiquidityPoolAdmin, Exchange);
  deployer.link(LiquidityPools, Exchange);
  deployer.link(Trading, Exchange);
  deployer.link(Withdrawing, Exchange);
};
