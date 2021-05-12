import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import { Factory, Factory__factory } from '../../types/ethers-contracts';

export default class FactoryContract extends BaseContract<Factory> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      Factory__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }

  public static async deploy(
    args: Parameters<Factory__factory['deploy']>,
    ownerWalletPrivateKey: string,
  ): Promise<FactoryContract> {
    const owner = new ethers.Wallet(
      ownerWalletPrivateKey,
      utils.loadProvider(),
    );

    const contract = await new Factory__factory(owner).deploy(...args);
    await contract.deployTransaction.wait();

    return new this(contract.address);
  }
}
