import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import {
  IPancakePair,
  IPancakePair__factory,
} from '../../types/ethers-contracts';

export default class PairContract extends BaseContract<IPancakePair> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      IPancakePair__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }
}
