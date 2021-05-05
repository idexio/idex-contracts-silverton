import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

let provider: ethers.providers.StaticJsonRpcProvider | null = null;

export async function initRpcApi(
  apiUrl: string,
  chainId: number,
): Promise<void> {
  const tempProvider = new ethers.providers.JsonRpcProvider(apiUrl, chainId);
  const network = await tempProvider.detectNetwork();
  if (chainId !== network.chainId) {
    throw new Error(
      `Chain ID ${chainId.toString()} provided, but the configured API URL ${apiUrl} is for chain ID ${network.chainId.toString()} (${
        network.name
      })`,
    );
  }
  provider = new ethers.providers.StaticJsonRpcProvider(apiUrl, chainId);
}

export function loadProvider(): ethers.providers.StaticJsonRpcProvider {
  if (!provider) {
    throw new Error(
      'RPC API not configured. Call initRpcApi before making API calls.',
    );
  }
  return provider;
}

export type LibraryName =
  | 'AssetRegistryAdmin'
  | 'Depositing'
  | 'LiquidityPoolRegistry'
  | 'Trading'
  | 'Withdrawing';

const libraryNameToBytecodeMap = new Map<LibraryName, string>();

export function loadLibraryBytecode(name: LibraryName): string {
  if (!libraryNameToBytecodeMap.has(name)) {
    const { bytecode } = JSON.parse(
      fs
        .readFileSync(path.join(__dirname, '..', 'contracts', `${name}.json`))
        .toString('utf8'),
    );
    libraryNameToBytecodeMap.set(name, bytecode);
  }
  return libraryNameToBytecodeMap.get(name) as string; // Will never be undefined as it gets set above
}

export async function deployLibrary(
  ownerWalletPrivateKey: string,
  name: LibraryName,
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
