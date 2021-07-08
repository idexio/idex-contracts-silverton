import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import { Exchange, Exchange__factory } from '../../types/ethers-contracts';

export default class ExchangeContract extends BaseContract<Exchange> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      Exchange__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }

  public static async deploy(
    args: Parameters<Exchange__factory['deploy']>,
    libraryAddresses: {
      assetRegistryAdmin: string;
      depositing: string;
      liquidityPools: string;
      trading: string;
      withdrawing: string;
    },
    ownerWalletPrivateKey: string,
  ): Promise<ExchangeContract> {
    const linkLibraryAddresses: ConstructorParameters<
      typeof Exchange__factory
    >[0] = {
      __AssetRegistryAdmin____________________:
        libraryAddresses.assetRegistryAdmin,
      __Depositing____________________________: libraryAddresses.depositing,
      __LiquidityPools________________________: libraryAddresses.liquidityPools,
      __Trading_______________________________: libraryAddresses.trading,
      __Withdrawing___________________________: libraryAddresses.withdrawing,
    };

    const owner = new ethers.Wallet(
      ownerWalletPrivateKey,
      utils.loadProvider(),
    );

    const contract = await new Exchange__factory(
      linkLibraryAddresses,
      owner,
    ).deploy(...args);
    await contract.deployTransaction.wait();

    return new this(contract.address);
  }
}
