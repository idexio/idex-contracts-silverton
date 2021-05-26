const { execSync } = require('child_process');

function compileCompleteHandler(config) {
  execSync(
    'hardhat compile && find ./artifacts/external_contracts -name \\*.json -a -not -name \\*.dbg.json -exec cp {} .coverage_artifacts/contracts \\;',
  );
}

module.exports = {
  istanbulReporter: ['json-summary', 'html', 'text'],
  mocha: {
    enableTimeouts: false,
  },
  onCompileComplete: compileCompleteHandler,
};
