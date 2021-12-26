// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetTransfers } from './AssetTransfers.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { Constants } from './Constants.sol';
import { LiquidityPools } from './LiquidityPools.sol';
import { LiquidityProviderToken } from '../LiquidityProviderToken.sol';
import { Validations } from './Validations.sol';
import {
  ICustodian,
  IERC20,
  IExchange,
  ILiquidityProviderToken,
  IWETH9
} from './Interfaces.sol';

import { Asset, LiquidityMigration, LiquidityPool } from './Structs.sol';

library LiquidityPoolAdmin {
  using AssetRegistry for AssetRegistry.Storage;

  function upgradeLiquidityPool(
    LiquidityPools.Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    AssetRegistry.Storage storage assetRegistry,
    IExchange balanceMigrationSource,
    ICustodian custodian
  ) public {
    require(
      custodian.loadExchange() == address(this),
      'Can only be set on Exchange whitelisted with Custodian'
    );

    // Use bidirectional mapping to require uniqueness of pools by asset pair regardless of
    // base-quote positions
    require(
      address(
        self.liquidityProviderTokensByAddress[baseAssetAddress][
          quoteAssetAddress
        ]
      ) == address(0x0),
      'Pool already exists'
    );

    // loadLiquidityPoolByAssetAddresses will revert if the pool does not exist
    LiquidityPool memory migrationSourcePool =
      balanceMigrationSource.loadLiquidityPoolByAssetAddresses(
        baseAssetAddress,
        quoteAssetAddress
      );

    // Create internally-tracked liquidity pool
    self.poolsByAddresses[baseAssetAddress][
      quoteAssetAddress
    ] = migrationSourcePool;

    // Store LP token address in both pair directions to allow lookup by unordered asset pairs
    // during on-chain initiated liquidity removals
    self.liquidityProviderTokensByAddress[baseAssetAddress][
      quoteAssetAddress
    ] = ILiquidityProviderToken(migrationSourcePool.liquidityProviderToken);
    self.liquidityProviderTokensByAddress[quoteAssetAddress][
      baseAssetAddress
    ] = ILiquidityProviderToken(migrationSourcePool.liquidityProviderToken);

    // Build an asset descriptor for the LP token and add it to the registry.
    Asset memory lpTokenAsset =
      Asset({
        exists: true,
        assetAddress: address(migrationSourcePool.liquidityProviderToken),
        symbol: string(
          abi.encodePacked(
            'ILP-',
            migrationSourcePool.liquidityProviderToken.baseAssetSymbol(),
            '-',
            migrationSourcePool.liquidityProviderToken.quoteAssetSymbol()
          )
        ),
        decimals: Constants.liquidityProviderTokenDecimals,
        isConfirmed: true,
        confirmedTimestampInMs: uint64(block.timestamp * 1000) // Block timestamp is in seconds, store ms
      });
    assetRegistry.assetsByAddress[lpTokenAsset.assetAddress] = lpTokenAsset;
    assetRegistry.assetsBySymbol[lpTokenAsset.symbol].push(lpTokenAsset);
  }

  function createLiquidityPool(
    LiquidityPools.Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    AssetRegistry.Storage storage assetRegistry
  ) public {
    {
      createLiquidityPoolByAssetAddresses(
        self,
        baseAssetAddress,
        quoteAssetAddress,
        assetRegistry
      );
    }
  }

  function migrateLiquidityPool(
    LiquidityPools.Storage storage self,
    LiquidityMigration memory migration,
    ICustodian custodian,
    AssetRegistry.Storage storage assetRegistry
  ) public returns (address liquidityProviderToken) {
    require(
      AssetUnitConversions.assetUnitsToPips(
        migration.desiredLiquidity,
        Constants.liquidityProviderTokenDecimals
      ) > 0,
      'Desired liquidity too low'
    );

    {
      // Map Pair token reserve addresses to provided market base/quote addresses
      (
        address baseAssetAddress,
        address quoteAssetAddress,
        uint256 baseAssetQuantityInAssetUnits,
        uint256 quoteAssetQuantityInAssetUnits
      ) = transferMigratedTokenReservesToCustodian(migration, custodian);

      LiquidityPool storage pool;
      pool = loadOrCreateLiquidityPoolByAssetAddresses(
        self,
        baseAssetAddress,
        quoteAssetAddress,
        assetRegistry
      );
      liquidityProviderToken = address(pool.liquidityProviderToken);

      {
        // Convert transferred reserve amounts to pips and store
        pool.baseAssetReserveInPips += AssetUnitConversions.assetUnitsToPips(
          baseAssetQuantityInAssetUnits,
          pool.baseAssetDecimals
        );
        require(pool.baseAssetReserveInPips > 0, 'Insufficient base quantity');

        pool.quoteAssetReserveInPips += AssetUnitConversions.assetUnitsToPips(
          quoteAssetQuantityInAssetUnits,
          pool.quoteAssetDecimals
        );
        require(
          pool.quoteAssetReserveInPips > 0,
          'Insufficient quote quantity'
        );

        Validations.validatePoolReserveRatio(pool);
      }

      // Mint desired liquidity to Farm to complete migration
      ILiquidityProviderToken(liquidityProviderToken).mint(
        address(this),
        migration.desiredLiquidity,
        baseAssetQuantityInAssetUnits,
        quoteAssetQuantityInAssetUnits,
        migration.to
      );
    }
  }

  function reverseLiquidityPoolAssets(
    LiquidityPools.Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress
  ) public {
    LiquidityPool memory pool =
      LiquidityPools.loadLiquidityPoolByAssetAddresses(
        self,
        baseAssetAddress,
        quoteAssetAddress
      );

    delete self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
    self.poolsByAddresses[quoteAssetAddress][baseAssetAddress] = pool;

    (
      pool.baseAssetReserveInPips,
      pool.baseAssetDecimals,
      pool.quoteAssetReserveInPips,
      pool.quoteAssetDecimals
    ) = (
      pool.quoteAssetReserveInPips,
      pool.quoteAssetDecimals,
      pool.baseAssetReserveInPips,
      pool.baseAssetDecimals
    );
    pool.liquidityProviderToken.reverseAssets();
  }

  // Helpers //

  function loadOrCreateLiquidityPoolByAssetAddresses(
    LiquidityPools.Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    AssetRegistry.Storage storage assetRegistry
  ) private returns (LiquidityPool storage pool) {
    pool = self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];

    if (!pool.exists) {
      pool = createLiquidityPoolByAssetAddresses(
        self,
        baseAssetAddress,
        quoteAssetAddress,
        assetRegistry
      );
    }
  }

  function createLiquidityPoolByAssetAddresses(
    LiquidityPools.Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    AssetRegistry.Storage storage assetRegistry
  ) private returns (LiquidityPool storage pool) {
    // Use bidirectional mapping to require uniqueness of pools by asset pair regardless of
    // base-quote positions
    require(
      address(
        self.liquidityProviderTokensByAddress[baseAssetAddress][
          quoteAssetAddress
        ]
      ) == address(0x0),
      'Pool already exists'
    );

    // Create internally-tracked liquidity pool
    pool = self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
    pool.exists = true;

    // Store asset decimals to avoid redundant asset registry lookups
    Asset memory asset;
    asset = assetRegistry.loadAssetByAddress(baseAssetAddress);
    string memory baseAssetSymbol = asset.symbol;
    pool.baseAssetDecimals = asset.decimals;
    asset = assetRegistry.loadAssetByAddress(quoteAssetAddress);
    string memory quoteAssetSymbol = asset.symbol;
    pool.quoteAssetDecimals = asset.decimals;

    // Create an LP token contract tied to this market. Construct salt from byte-sorted assets to
    // maintain a stable address if asset direction is reversed via `reverseLiquidityPoolAssets`
    bytes32 salt =
      keccak256(
        baseAssetAddress < quoteAssetAddress
          ? abi.encodePacked(baseAssetAddress, quoteAssetAddress)
          : abi.encodePacked(quoteAssetAddress, baseAssetAddress)
      );
    ILiquidityProviderToken liquidityProviderToken =
      new LiquidityProviderToken{ salt: salt }(
        baseAssetAddress,
        quoteAssetAddress,
        baseAssetSymbol,
        quoteAssetSymbol
      );

    // Store LP token address in both pair directions to allow lookup by unordered asset pairs
    // during on-chain initiated liquidity removals
    self.liquidityProviderTokensByAddress[baseAssetAddress][
      quoteAssetAddress
    ] = ILiquidityProviderToken(liquidityProviderToken);
    self.liquidityProviderTokensByAddress[quoteAssetAddress][
      baseAssetAddress
    ] = ILiquidityProviderToken(liquidityProviderToken);

    // Associate the newly created LP token contract with the pool
    pool.liquidityProviderToken = ILiquidityProviderToken(
      liquidityProviderToken
    );

    // Build an asset descriptor for the new LP token and add it to the registry. There is no need
    // to validate against it already existing as the preceeding CREATE2 will revert on duplicate
    // asset pairs
    Asset memory lpTokenAsset =
      Asset({
        exists: true,
        assetAddress: address(liquidityProviderToken),
        symbol: string(
          abi.encodePacked('ILP-', baseAssetSymbol, '-', quoteAssetSymbol)
        ),
        decimals: Constants.liquidityProviderTokenDecimals,
        isConfirmed: true,
        confirmedTimestampInMs: uint64(block.timestamp * 1000) // Block timestamp is in seconds, store ms
      });
    assetRegistry.assetsByAddress[lpTokenAsset.assetAddress] = lpTokenAsset;
    assetRegistry.assetsBySymbol[lpTokenAsset.symbol].push(lpTokenAsset);
  }

  function transferMigratedTokenReservesToCustodian(
    LiquidityMigration memory migration,
    ICustodian custodian
  )
    private
    returns (
      address baseAssetAddress,
      address quoteAssetAddress,
      uint256 baseAssetQuantityInAssetUnits,
      uint256 quoteAssetQuantityInAssetUnits
    )
  {
    // Obtain reserve amounts sent to the Exchange
    uint256 reserve0 = IERC20(migration.token0).balanceOf(address(this));
    uint256 reserve1 = IERC20(migration.token1).balanceOf(address(this));
    // Transfer reserves to Custodian and unwrap WETH if needed
    transferMigratedTokenReserveToCustodian(
      migration.token0,
      reserve0,
      migration.WETH,
      custodian
    );
    transferMigratedTokenReserveToCustodian(
      migration.token1,
      reserve1,
      migration.WETH,
      custodian
    );

    address unwrappedToken0 =
      migration.token0 == address(migration.WETH)
        ? address(0x0)
        : migration.token0;
    address unwrappedToken1 =
      migration.token1 == address(migration.WETH)
        ? address(0x0)
        : migration.token1;

    return
      migration.isToken1Quote
        ? (unwrappedToken0, unwrappedToken1, reserve0, reserve1)
        : (unwrappedToken1, unwrappedToken0, reserve1, reserve0);
  }

  function transferMigratedTokenReserveToCustodian(
    address token,
    uint256 reserve,
    IWETH9 WETH,
    ICustodian custodian
  ) private {
    // Unwrap WETH
    if (token == address(WETH)) {
      WETH.withdraw(reserve);
      AssetTransfers.transferTo(
        payable(address(custodian)),
        address(0x0),
        reserve
      );
    } else {
      AssetTransfers.transferTo(payable(address(custodian)), token, reserve);
    }
  }
}
