import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

import { initRpcApi, loadProvider } from './utils';

import ExchangeContract from './ExchangeContract';
import IERC20Contract from './IERC20Contract';
import FactoryContract from './FactoryContract';
import FarmContract from './FarmContract';
import FaucetTokenContract from './FaucetTokenContract';
import MigratorContract from './MigratorContract';
import PairContract from './PairContract';
import WETHContract from './WETHContract';

export {
  initRpcApi,
  ExchangeContract,
  IERC20Contract,
  FactoryContract,
  FarmContract,
  FaucetTokenContract,
  MigratorContract,
  PairContract,
  WETHContract,
};

export type LibraryName =
  | 'AssetRegistry'
  | 'Depositing'
  | 'LiquidityPoolAdmin'
  | 'LiquidityPools'
  | 'NonceInvalidations'
  | 'Trading'
  | 'Withdrawing';

export async function deployLibrary(
  name: LibraryName,
  ownerWalletPrivateKey: string,
): Promise<string> {
  const bytecode = loadLibraryBytecode(name);
  const owner = new ethers.Wallet(ownerWalletPrivateKey, loadProvider());
  const library = await new ethers.ContractFactory(
    [],
    bytecode,
    owner,
  ).deploy();
  await library.deployTransaction.wait();

  return library.address;
}

const libraryNameToBytecodeMap = new Map<LibraryName, string>();

function loadLibraryBytecode(name: LibraryName): string {
  if (!libraryNameToBytecodeMap.has(name)) {
    const { bytecode } = JSON.parse(
      fs
        .readFileSync(
          path.join(__dirname, '..', '..', 'contracts', `${name}.json`),
        )
        .toString('utf8'),
    );
    libraryNameToBytecodeMap.set(name, bytecode);
  }
  return libraryNameToBytecodeMap.get(name) as string; // Will never be undefined as it gets set above
}
