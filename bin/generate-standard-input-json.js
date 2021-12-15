const fs = require('fs');

const sources = [
  'Address.sol',
  'AssetRegistry.sol',
  'AssetTransfers.sol',
  'AssetUnitConversions.sol',
  'BalanceTracking.sol',
  'Constants.sol',
  'Context.sol',
  'Custodian.sol',
  'Depositing.sol',
  'ECDSA.sol',
  'ERC20.sol',
  'Enums.sol',
  'Exchange.sol',
  'FaucetToken.sol',
  'Governance.sol',
  'Hashing.sol',
  'HybridTradeHelpers.sol',
  'HybridTradeValidations.sol',
  'IERC20.sol',
  'IERC20Metadata.sol',
  'Interfaces.sol',
  'LiquidityChangeExecutionHelpers.sol',
  'LiquidityChangeExecutionValidations.sol',
  'LiquidityPoolAdmin.sol',
  'LiquidityPoolHelpers.sol',
  'LiquidityPools.sol',
  'LiquidityProviderToken.sol',
  'Math.sol',
  'Migrations.sol',
  'NonceInvalidations.sol',
  'OrderBookTradeValidations.sol',
  'Owned.sol',
  'PoolTradeHelpers.sol',
  'PoolTradeValidations.sol',
  'Structs.sol',
  'Trading.sol',
  'UUID.sol',
  'Validations.sol',
  'Withdrawing.sol',
];

const input = {
  language: 'Solidity',
  sources: {},
  settings: {
    outputSelection: {
      'Exchange.sol': {
        Exchange: ['abi', 'evm.bytecode'],
      },
    },
    optimizer: { enabled: true, runs: 1 },
    evmVersion: 'berlin',
    metadata: { bytecodeHash: 'ipfs' },
    libraries: {
      'Exchange.sol': {
        AssetRegistry: '0xc2f05d03915E7c2D9038830F7888c97e351dd3dB',
        Depositing: '0x116310b243dd287d4285d0e8a34ce3d4adb63dac',
        LiquidityPoolAdmin: '0x7a246e4434dd31df784bb88d3443e309e3143adc',
        LiquidityPools: '0x0f2c07f4ecc6c9d74d16e735d2a59d00985b1962',
        NonceInvalidations: '0x6c539e6143f70408076f35d19e7e549850c021ad',
        Trading: '0x4d3250014ea4ecddd857fad48c3d64d2e4f037e1',
        Withdrawing: '0xb3af24eeac0ee8b6f5798f8a75e3ecd51b18deb2',
      },
      'AssetRegistry.sol': {
        AssetRegistry: '0xc2f05d03915E7c2D9038830F7888c97e351dd3dB',
      },
      'Depositing.sol': {
        Depositing: '0x116310b243dd287d4285d0e8a34ce3d4adb63dac',
      },
      'LiquidityPoolAdmin.sol': {
        LiquidityPoolAdmin: '0x7a246e4434dd31df784bb88d3443e309e3143adc',
      },
      'LiquidityPools.sol': {
        LiquidityPools: '0x0f2c07f4ecc6c9d74d16e735d2a59d00985b1962',
      },
      'NonceInvalidations.sol': {
        NonceInvalidations: '0x6c539e6143f70408076f35d19e7e549850c021ad',
      },
      'Trading.sol': {
        Trading: '0x4d3250014ea4ecddd857fad48c3d64d2e4f037e1',
      },
      'Withdrawing.sol': {
        Withdrawing: '0xb3af24eeac0ee8b6f5798f8a75e3ecd51b18deb2',
      },
    },
  },
};

for (const source of sources) {
  input.sources[source] = { content: fs.readFileSync(source).toString() };
}

console.log(JSON.stringify(input));
