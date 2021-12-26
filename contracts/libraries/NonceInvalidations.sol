// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { NonceInvalidation } from './Structs.sol';
import { UUID } from './UUID.sol';

library NonceInvalidations {
  function invalidateOrderNonce(
    mapping(address => NonceInvalidation) storage self,
    uint128 nonce,
    uint256 chainPropagationPeriod
  ) external returns (uint64 timestampInMs, uint256 effectiveBlockNumber) {
    timestampInMs = UUID.getTimestampInMsFromUuidV1(nonce);
    // Enforce a maximum skew for invalidating nonce timestamps in the future so the user doesn't
    // lock their wallet from trades indefinitely
    require(timestampInMs < getOneDayFromNowInMs(), 'Nonce timestamp too high');

    if (self[msg.sender].exists) {
      require(
        self[msg.sender].timestampInMs < timestampInMs,
        'Nonce timestamp invalidated'
      );
      require(
        self[msg.sender].effectiveBlockNumber <= block.number,
        'Last invalidation not finalized'
      );
    }

    // Changing the Chain Propagation Period will not affect the effectiveBlockNumber for this invalidation
    effectiveBlockNumber = block.number + chainPropagationPeriod;
    self[msg.sender] = NonceInvalidation(
      true,
      timestampInMs,
      effectiveBlockNumber
    );
  }

  function getOneDayFromNowInMs() private view returns (uint64) {
    uint64 secondsInOneDay = 24 * 60 * 60; // 24 hours/day * 60 min/hour * 60 seconds/min
    uint64 msInOneSecond = 1000;

    return (uint64(block.timestamp) + secondsInOneDay) * msInOneSecond;
  }
}
