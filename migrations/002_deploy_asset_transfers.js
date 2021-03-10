const Custodian = artifacts.require('Custodian');
const Exchange = artifacts.require('Exchange');
const ExchangeMock = artifacts.require('ExchangeMock');
const AssetTransfers = artifacts.require('AssetTransfers');

module.exports = function (deployer) {
  deployer.deploy(AssetTransfers);
  deployer.link(AssetTransfers, Custodian);
  deployer.link(AssetTransfers, Exchange);
  deployer.link(AssetTransfers, ExchangeMock);
};
