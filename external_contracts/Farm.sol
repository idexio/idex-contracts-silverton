// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.6.12;

import {
  IDEXFarm,
  IERC20
} from '@idexio/idex-farm/contracts/IDEXFarm_flat.sol';

contract Farm is IDEXFarm {
  constructor(IERC20 _rewardToken, uint256 _rewardTokenPerBlock)
    public
    IDEXFarm(_rewardToken, _rewardTokenPerBlock)
  {}
}
