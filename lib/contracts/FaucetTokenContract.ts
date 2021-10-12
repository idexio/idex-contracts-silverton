import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import {
  FaucetToken,
  FaucetToken__factory,
} from '../../types/ethers-contracts';

export default class FaucetTokenContract extends BaseContract<FaucetToken> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      FaucetToken__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }

  public static async deploy(
    args: Parameters<FaucetToken__factory['deploy']>,
    ownerWalletPrivateKey: string,
  ): Promise<FaucetTokenContract> {
    const owner = new ethers.Wallet(
      ownerWalletPrivateKey,
      utils.loadProvider(),
    );

    const contract = await new FaucetToken__factory(owner).deploy(...args);
    await contract.deployTransaction.wait();

    return new this(contract.address);
  }
}
