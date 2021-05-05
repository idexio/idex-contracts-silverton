import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import {
  TestFactory,
  TestFactory__factory,
} from '../../types/ethers-contracts';

export default class TestFactoryContract extends BaseContract<TestFactory> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      TestFactory__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }

  public static async deploy(
    ownerWalletPrivateKey: string,
    args: Parameters<TestFactory__factory['deploy']>,
  ): Promise<TestFactoryContract> {
    const owner = new ethers.Wallet(
      ownerWalletPrivateKey,
      utils.loadProvider(),
    );

    const contract = await new TestFactory__factory(owner).deploy(...args);
    await contract.deployTransaction.wait();

    return new this(contract.address);
  }
}
