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
