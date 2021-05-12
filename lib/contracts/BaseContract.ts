import { ethers } from 'ethers';

export default abstract class BaseContract<Contract extends ethers.Contract> {
  protected readonly contract: Contract;

  protected constructor(contract: Contract) {
    this.contract = contract;
  }

  public getAddress(): string {
    return this.contract.address;
  }

  public getEthersContract(): Contract {
    return this.contract;
  }
}
