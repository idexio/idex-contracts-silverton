import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import { Farm, Farm__factory } from '../../types/ethers-contracts';

export default class FarmContract extends BaseContract<Farm> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      Farm__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }

  public static async deploy(
    args: Parameters<Farm__factory['deploy']>,
    ownerWalletPrivateKey: string,
  ): Promise<FarmContract> {
    const owner = new ethers.Wallet(
      ownerWalletPrivateKey,
      utils.loadProvider(),
    );

    const contract = await new Farm__factory(owner).deploy(...args);
    await contract.deployTransaction.wait();

    return new this(contract.address);
  }
}
