const Exchange = artifacts.require('Exchange');
const Validations = artifacts.require('Validations');

module.exports = function (deployer) {
  deployer.deploy(Validations);
  deployer.link(Validations, Exchange);
};
