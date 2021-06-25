import { ethers } from 'ethers';

import * as utils from './utils';
import BaseContract from './BaseContract';

import { IERC20, IERC20__factory } from '../../types/ethers-contracts';

export default class IERC20Contract extends BaseContract<IERC20> {
  public constructor(address: string, signerWalletPrivateKey?: string) {
    super(
      IERC20__factory.connect(
        address,
        signerWalletPrivateKey
          ? new ethers.Wallet(signerWalletPrivateKey, utils.loadProvider())
          : utils.loadProvider(),
      ),
    );
  }
}
