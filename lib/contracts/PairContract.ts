import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import { IIDEXPair, IIDEXPair__factory } from '../../types/ethers-contracts';

export default class PairContract extends BaseContract<IIDEXPair> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      IIDEXPair__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }
}
