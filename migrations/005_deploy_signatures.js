const Exchange = artifacts.require('Exchange');
const Signatures = artifacts.require('Signatures');

module.exports = function (deployer) {
  deployer.deploy(Signatures);
  deployer.link(Signatures, Exchange);
};
