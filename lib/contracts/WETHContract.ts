import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import { WETH, WETH__factory } from '../../types/ethers-contracts';

export default class WETHContract extends BaseContract<WETH> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      WETH__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }

  public static async deploy(
    ownerWalletPrivateKey: string,
  ): Promise<WETHContract> {
    const owner = new ethers.Wallet(
      ownerWalletPrivateKey,
      utils.loadProvider(),
    );

    const contract = await new WETH__factory(owner).deploy();
    await contract.deployTransaction.wait();

    return new this(contract.address);
  }
}
