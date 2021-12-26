import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import {
  ExchangeV31,
  ExchangeV31__factory,
} from '../../types/ethers-contracts';

export default class ExchangeContract extends BaseContract<ExchangeV31> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      ExchangeV31__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }

  public static async deploy(
    args: Parameters<ExchangeV31__factory['deploy']>,
    libraryAddresses: {
      assetRegistry: string;
      depositing: string;
      liquidityPoolAdmin: string;
      liquidityPools: string;
      nonceInvalidations: string;
      trading: string;
      withdrawing: string;
    },
    ownerWalletPrivateKey: string,
  ): Promise<ExchangeContract> {
    const linkLibraryAddresses: ConstructorParameters<
      typeof ExchangeV31__factory
    >[0] = {
      __AssetRegistry_________________________: libraryAddresses.assetRegistry,
      __Depositing____________________________: libraryAddresses.depositing,
      __NonceInvalidations____________________:
        libraryAddresses.nonceInvalidations,
      __LiquidityPoolAdmin____________________:
        libraryAddresses.liquidityPoolAdmin,
      __LiquidityPools________________________: libraryAddresses.liquidityPools,
      __Trading_______________________________: libraryAddresses.trading,
      __Withdrawing___________________________: libraryAddresses.withdrawing,
    };

    const owner = new ethers.Wallet(
      ownerWalletPrivateKey,
      utils.loadProvider(),
    );

    const contract = await new ExchangeV31__factory(
      linkLibraryAddresses,
      owner,
    ).deploy(...args);
    await contract.deployTransaction.wait();

    return new this(contract.address);
  }
}
