import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import { Migrator, Migrator__factory } from '../../types/ethers-contracts';

export default class MigratorContract extends BaseContract<Migrator> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      Migrator__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }

  public static async deploy(
    args: Parameters<Migrator__factory['deploy']>,
    ownerWalletPrivateKey: string,
  ): Promise<MigratorContract> {
    const owner = new ethers.Wallet(
      ownerWalletPrivateKey,
      utils.loadProvider(),
    );

    const contract = await new Migrator__factory(owner).deploy(...args);
    await contract.deployTransaction.wait();

    return new this(contract.address);
  }
}
