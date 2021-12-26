import type {
  BalanceMigrationSourceMockInstance,
  CustodianInstance,
  ExchangeV31Instance,
  FarmInstance,
  GovernanceInstance,
  TestTokenInstance,
  WETHInstance,
} from '../../types/truffle-contracts';
import type { Withdrawal } from '../../lib';

import {
  decimalToAssetUnits,
  getWithdrawArguments,
  getWithdrawalHash,
  nativeAssetSymbol,
} from '../../lib';

// TODO Test tokens with decimals other than 18
export const minimumDecimalQuantity = '0.00000001';
export const minimumTokenQuantity = decimalToAssetUnits(
  minimumDecimalQuantity,
  18,
);
export const deployAndAssociateContracts = async (
  blockDelay = 0,
  balanceMigrationSourceAddress?: string,
): Promise<{
  balanceMigrationSource: BalanceMigrationSourceMockInstance;
  custodian: CustodianInstance;
  exchange: ExchangeV31Instance;
  farm: FarmInstance;
  governance: GovernanceInstance;
  weth: WETHInstance;
}> => {
  const BalanceMigrationSourceMock = artifacts.require(
    'BalanceMigrationSourceMock',
  );
  const Custodian = artifacts.require('Custodian');
  const Exchange = artifacts.require('Exchange_v3_1');
  const Governance = artifacts.require('Governance');

  const WETH = artifacts.require('WETH');
  const weth = await WETH.new();

  const Farm = artifacts.require('Farm');
  const Token = artifacts.require('TestToken');
  const rewardToken = await Token.new();
  const farm = await Farm.new(rewardToken.address, 1);

  const balanceMigrationSource = await (balanceMigrationSourceAddress
    ? BalanceMigrationSourceMock.at(balanceMigrationSourceAddress)
    : BalanceMigrationSourceMock.new(0));

  const [exchange, governance] = await Promise.all([
    Exchange.new(
      balanceMigrationSource.address,
      weth.address,
      nativeAssetSymbol,
    ), // Fee wallet is just WETH
    Governance.new(blockDelay),
  ]);
  const custodian = await Custodian.new(exchange.address, governance.address);
  await exchange.setCustodian(custodian.address);
  await governance.setCustodian(custodian.address);
  await exchange.setDepositIndex();

  return {
    balanceMigrationSource,
    custodian,
    exchange,
    farm,
    governance,
    weth,
  };
};

export const deployAndRegisterToken = async (
  exchange: ExchangeV31Instance,
  tokenSymbol: string,
  decimals = 18,
): Promise<TestTokenInstance> => {
  const Token = artifacts.require('TestToken');
  const token = await Token.new();
  await exchange.registerToken(token.address, tokenSymbol, decimals);
  await exchange.confirmTokenRegistration(token.address, tokenSymbol, decimals);

  return token;
};

export const getSignature = async (
  web3: Web3,
  data: string,
  wallet: string,
): Promise<string> => {
  const signature = await web3.eth.sign(data, wallet);
  // https://github.com/OpenZeppelin/openzeppelin-contracts/issues/2190
  // The Ethereum spec requires a v value of 27 or 28, but ganache's RPC signature returns
  // a 0 or 1 instead. Add 27 in this case to make compatible with ECDSA recover
  let v = parseInt(signature.slice(130, 132), 16);
  if (v < 27) {
    v += 27;
  }
  const vHex = v.toString(16);
  return signature.slice(0, 130) + vHex;
};

export const withdraw = async (
  web3: Web3,
  exchange: ExchangeV31Instance,
  withdrawal: Withdrawal,
  wallet: string,
  gasFee = '0.00000000',
): Promise<void> => {
  const [withdrawalStruct] = await getWithdrawArguments(
    withdrawal,
    gasFee,
    await getSignature(web3, getWithdrawalHash(withdrawal), wallet),
  );

  await exchange.withdraw(withdrawalStruct);
};

// https://docs.nethereum.com/en/latest/ethereum-and-clients/ganache-cli/#implemented-methods
export const increaseBlockTimestamp = async (): Promise<void> => {
  await sendRpc('evm_increaseTime', [1]); // 1 second
  await sendRpc('evm_mine', []);
};

const sendRpc = async (method: string, params: unknown[]): Promise<unknown> =>
  new Promise((resolve, reject) => {
    (web3 as any).currentProvider.send(
      {
        jsonrpc: '2.0',
        method,
        params,
        id: new Date().getTime(),
      },
      (err: unknown, res: unknown) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      },
    );
  });
