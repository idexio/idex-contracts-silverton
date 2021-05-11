import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import { WBNB, WBNB__factory } from '../../types/ethers-contracts';

export default class WBNBContract extends BaseContract<WBNB> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      WBNB__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }

  public static async deploy(
    ownerWalletPrivateKey: string,
  ): Promise<WBNBContract> {
    const owner = new ethers.Wallet(
      ownerWalletPrivateKey,
      utils.loadProvider(),
    );

    const contract = await new WBNB__factory(owner).deploy();
    await contract.deployTransaction.wait();

    return new this(contract.address);
  }
}
