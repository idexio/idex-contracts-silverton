const Custodian = artifacts.require('Custodian');
const Exchange = artifacts.require('Exchange');
const AssetRegistryAdmin = artifacts.require('AssetRegistryAdmin');

module.exports = function (deployer) {
  deployer.deploy(AssetRegistryAdmin);
  deployer.link(AssetRegistryAdmin, Exchange);
};
