// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { Address } from '@openzeppelin/contracts/utils/Address.sol';

import { IERC20, Structs } from './Interfaces.sol';

/**
 * @notice Library helper functions for reading from a registry of asset descriptors indexed by address and symbol
 */
library AssetRegistry {
  struct Storage {
    mapping(address => Structs.Asset) assetsByAddress;
    // Mapping value is array since the same symbol can be re-used for a different address
    // (usually as a result of a token swap or upgrade)
    mapping(string => Structs.Asset[]) assetsBySymbol;
  }

  /**
   * @dev Resolves an asset address into corresponding Asset struct
   *
   * @param assetAddress Ethereum address of asset
   */
  function loadAssetByAddress(Storage storage self, address assetAddress)
    internal
    view
    returns (Structs.Asset memory)
  {
    if (assetAddress == address(0x0)) {
      return getBnbAsset();
    }

    Structs.Asset memory asset = self.assetsByAddress[assetAddress];
    require(
      asset.exists && asset.isConfirmed,
      'No confirmed asset found for address'
    );

    return asset;
  }

  /**
   * @dev Resolves a asset symbol into corresponding Asset struct
   *
   * @param symbol Asset symbol, e.g. 'IDEX'
   * @param timestampInMs Milliseconds since Unix epoch, usually parsed from a UUID v1 order nonce.
   * Constrains symbol resolution to the asset most recently confirmed prior to timestampInMs. Reverts
   * if no such asset exists
   */
  function loadAssetBySymbol(
    Storage storage self,
    string memory symbol,
    uint64 timestampInMs
  ) internal view returns (Structs.Asset memory asset) {
    if (isStringEqual('BNB', symbol)) {
      return Structs.Asset(true, address(0x0), 'BNB', 18, true, 0);
    }

    Structs.Asset[] memory assets = self.assetsBySymbol[symbol];
    uint256 assetLength = assets.length;
    require(assetLength > 0, 'No confirmed asset found for symbol');

    if (assetLength == 1) {
      asset = assets[0];
      require(
        asset.confirmedTimestampInMs <= timestampInMs,
        'No confirmed asset found for symbol'
      );
    } else {
      for (uint256 i = 0; i < assetLength; i++) {
        if (assets[i].confirmedTimestampInMs <= timestampInMs) {
          asset = assets[i];
        }
      }
    }
    require(
      asset.exists && asset.isConfirmed,
      'No confirmed asset found for symbol'
    );
  }

  /**
   * @dev BNB is modeled as an always-confirmed Asset struct for programmatic consistency
   */
  function getBnbAsset() private pure returns (Structs.Asset memory) {
    return Structs.Asset(true, address(0x0), 'BNB', 18, true, 0);
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
