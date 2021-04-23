// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { Address } from '@openzeppelin/contracts/utils/Address.sol';
import { AssetRegistry } from './AssetRegistry.sol';

import { IERC20, Structs } from './Interfaces.sol';

/**
 * @notice Library helper functions for managing a registry of asset descriptors indexed by address and symbol
 */
library AssetRegistryAdmin {
  function registerToken(
    AssetRegistry.Storage storage self,
    IERC20 tokenAddress,
    string calldata symbol,
    uint8 decimals
  ) external {
    require(decimals <= 32, 'Token cannot have more than 32 decimals');
    require(
      tokenAddress != IERC20(address(0x0)) &&
        Address.isContract(address(tokenAddress)),
      'Invalid token address'
    );
    // The string type does not have a length property so cast to bytes to check for empty string
    require(bytes(symbol).length > 0, 'Invalid token symbol');
    require(
      !self.assetsByAddress[address(tokenAddress)].isConfirmed,
      'Token already finalized'
    );

    self.assetsByAddress[address(tokenAddress)] = Structs.Asset({
      exists: true,
      assetAddress: address(tokenAddress),
      symbol: symbol,
      decimals: decimals,
      isConfirmed: false,
      confirmedTimestampInMs: 0
    });
  }

  function confirmTokenRegistration(
    AssetRegistry.Storage storage self,
    IERC20 tokenAddress,
    string memory symbol,
    uint8 decimals
  ) external {
    Structs.Asset memory asset = self.assetsByAddress[address(tokenAddress)];
    require(asset.exists, 'Unknown token');
    require(!asset.isConfirmed, 'Token already finalized');
    require(isStringEqual(asset.symbol, symbol), 'Symbols do not match');
    require(asset.decimals == decimals, 'Decimals do not match');

    asset.isConfirmed = true;
    asset.confirmedTimestampInMs = uint64(block.timestamp * 1000); // Block timestamp is in seconds, store ms
    self.assetsByAddress[address(tokenAddress)] = asset;
    self.assetsBySymbol[symbol].push(asset);
  }

  function addTokenSymbol(
    AssetRegistry.Storage storage self,
    IERC20 tokenAddress,
    string memory symbol
  ) external {
    Structs.Asset memory asset = self.assetsByAddress[address(tokenAddress)];
    require(
      asset.exists && asset.isConfirmed,
      'Registration of token not finalized'
    );
    require(!isStringEqual(symbol, 'BNB'), 'BNB symbol reserved');

    // This will prevent swapping assets for previously existing orders
    uint64 msInOneSecond = 1000;
    asset.confirmedTimestampInMs = uint64(block.timestamp * msInOneSecond);

    self.assetsBySymbol[symbol].push(asset);
  }

  // See https://solidity.readthedocs.io/en/latest/types.html#bytes-and-strings-as-arrays
  function isStringEqual(string memory a, string memory b)
    private
    pure
    returns (bool)
  {
    return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
  }
}
