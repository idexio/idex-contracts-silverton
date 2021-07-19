// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { Address } from '@openzeppelin/contracts/utils/Address.sol';

import { Asset } from './Structs.sol';
import { AssetTransfers } from './AssetTransfers.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { IERC20 } from './Interfaces.sol';

/**
 * @notice Library helper functions for reading from a registry of asset descriptors indexed by address and symbol
 */
library AssetRegistry {
  struct Storage {
    mapping(address => Asset) assetsByAddress;
    // Mapping value is array since the same symbol can be re-used for a different address
    // (usually as a result of a token swap or upgrade)
    mapping(string => Asset[]) assetsBySymbol;
    // Blockchain-specific native asset symbol
    string nativeAssetSymbol;
  }

  // Admin //

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

    self.assetsByAddress[address(tokenAddress)] = Asset({
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
    string calldata symbol,
    uint8 decimals
  ) external {
    Asset memory asset = self.assetsByAddress[address(tokenAddress)];
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
    string calldata symbol
  ) external {
    Asset memory asset = self.assetsByAddress[address(tokenAddress)];
    require(
      asset.exists && asset.isConfirmed,
      'Registration of token not finalized'
    );
    require(
      !isStringEqual(symbol, self.nativeAssetSymbol),
      'Symbol reserved for native asset'
    );

    // This will prevent swapping assets for previously existing orders
    uint64 msInOneSecond = 1000;
    asset.confirmedTimestampInMs = uint64(block.timestamp * msInOneSecond);

    self.assetsBySymbol[symbol].push(asset);
  }

  function skim(address tokenAddress, address feeWallet) external {
    require(Address.isContract(tokenAddress), 'Invalid token address');

    uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
    AssetTransfers.transferTo(payable(feeWallet), tokenAddress, balance);
  }

  // Accessors //

  function loadBalanceInAssetUnitsByAddress(
    AssetRegistry.Storage storage self,
    address wallet,
    address assetAddress,
    BalanceTracking.Storage storage balanceTracking
  ) external view returns (uint256) {
    require(wallet != address(0x0), 'Invalid wallet address');

    Asset memory asset = loadAssetByAddress(self, assetAddress);
    return
      AssetUnitConversions.pipsToAssetUnits(
        loadBalanceInPipsFromMigrationSourceIfNeeded(
          wallet,
          assetAddress,
          balanceTracking
        ),
        asset.decimals
      );
  }

  function loadBalanceInAssetUnitsBySymbol(
    AssetRegistry.Storage storage self,
    address wallet,
    string calldata assetSymbol,
    BalanceTracking.Storage storage balanceTracking
  ) external view returns (uint256) {
    require(wallet != address(0x0), 'Invalid wallet address');

    Asset memory asset =
      loadAssetBySymbol(self, assetSymbol, getCurrentTimestampInMs());
    return
      AssetUnitConversions.pipsToAssetUnits(
        loadBalanceInPipsFromMigrationSourceIfNeeded(
          wallet,
          asset.assetAddress,
          balanceTracking
        ),
        asset.decimals
      );
  }

  function loadBalanceInPipsByAddress(
    address wallet,
    address assetAddress,
    BalanceTracking.Storage storage balanceTracking
  ) external view returns (uint64) {
    require(wallet != address(0x0), 'Invalid wallet address');

    return
      loadBalanceInPipsFromMigrationSourceIfNeeded(
        wallet,
        assetAddress,
        balanceTracking
      );
  }

  function loadBalanceInPipsBySymbol(
    Storage storage self,
    address wallet,
    string calldata assetSymbol,
    BalanceTracking.Storage storage balanceTracking
  ) external view returns (uint64) {
    require(wallet != address(0x0), 'Invalid wallet address');

    address assetAddress =
      loadAssetBySymbol(self, assetSymbol, getCurrentTimestampInMs())
        .assetAddress;
    return
      loadBalanceInPipsFromMigrationSourceIfNeeded(
        wallet,
        assetAddress,
        balanceTracking
      );
  }

  function loadBalanceInPipsFromMigrationSourceIfNeeded(
    address wallet,
    address assetAddress,
    BalanceTracking.Storage storage balanceTracking
  ) private view returns (uint64) {
    BalanceTracking.Balance memory balance =
      balanceTracking.balancesByWalletAssetPair[wallet][assetAddress];

    if (
      !balance.isMigrated &&
      address(balanceTracking.migrationSource) != address(0x0)
    ) {
      return
        balanceTracking.migrationSource.loadBalanceInPipsByAddress(
          wallet,
          assetAddress
        );
    }

    return balance.balanceInPips;
  }

  /**
   * @dev Resolves an asset address into corresponding Asset struct
   *
   * @param assetAddress Ethereum address of asset
   */
  function loadAssetByAddress(Storage storage self, address assetAddress)
    internal
    view
    returns (Asset memory)
  {
    if (assetAddress == address(0x0)) {
      return getEthAsset(self.nativeAssetSymbol);
    }

    Asset memory asset = self.assetsByAddress[assetAddress];
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
  ) internal view returns (Asset memory) {
    if (isStringEqual(self.nativeAssetSymbol, symbol)) {
      return getEthAsset(self.nativeAssetSymbol);
    }

    Asset memory asset;
    if (self.assetsBySymbol[symbol].length > 0) {
      for (uint8 i = 0; i < self.assetsBySymbol[symbol].length; i++) {
        if (
          self.assetsBySymbol[symbol][i].confirmedTimestampInMs <= timestampInMs
        ) {
          asset = self.assetsBySymbol[symbol][i];
        }
      }
    }
    require(
      asset.exists && asset.isConfirmed,
      'No confirmed asset found for symbol'
    );

    return asset;
  }

  // Util //

  function getCurrentTimestampInMs() internal view returns (uint64) {
    uint64 msInOneSecond = 1000;

    return uint64(block.timestamp) * msInOneSecond;
  }

  /**
   * @dev ETH is modeled as an always-confirmed Asset struct for programmatic consistency
   */
  function getEthAsset(string memory nativeAssetSymbol)
    private
    pure
    returns (Asset memory)
  {
    return Asset(true, address(0x0), nativeAssetSymbol, 18, true, 0);
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
