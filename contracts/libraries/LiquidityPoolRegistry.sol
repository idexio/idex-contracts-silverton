// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { Structs } from './Interfaces.sol';
import { AssetRegistry } from './AssetRegistry.sol';
import { UUID } from './/UUID.sol';

library LiquidityPoolRegistry {
    using AssetRegistry for AssetRegistry.Storage;

    struct LiquidityPool {
        // Flag to distinguish from empty struct
        bool exists;
        uint64 asset0ReserveInPips;
        uint64 asset1ReserveInPips;
        uint64 totalLiquidityShares;
        mapping(address => uint64) liquiditySharesByWallet;
    }

    struct Storage {
        mapping(address => mapping(address => LiquidityPool)) poolsByAddresses;
    }

    uint64 public constant MINIMUM_LIQUIDITY = 10**3;

    function addLiquidityPool(
        Storage storage self,
        address asset0Address,
        address asset1Address
    ) external {
        (address sortedAsset0Address, address sortedAsset1Address) =
            sortAssetAddresses(asset0Address, asset1Address);

        LiquidityPool storage pool =
            self.poolsByAddresses[sortedAsset0Address][sortedAsset1Address];
        require(!pool.exists, 'Pool already exists');

        pool.exists = true;
    }

    function addLiquidity(
        Storage storage self,
        AssetRegistry.Storage storage assetRegistry,
        Structs.LiquidityDeposit calldata liquidityDeposit
    )
        external
        returns (
            address asset0Address,
            address asset1Address,
            uint64 asset0QuantityInPips,
            uint64 asset1QuantityInPips,
            uint64 liquiditySharesMinted
        )
    {
        LiquidityPool storage pool;
        (pool, asset0Address, asset1Address) = loadLiquidityPoolByAssetSymbols(
            self,
            assetRegistry,
            liquidityDeposit.asset0Symbol,
            liquidityDeposit.asset1Symbol,
            UUID.getTimestampInMsFromUuidV1(liquidityDeposit.nonce)
        );

        (
            asset0QuantityInPips,
            asset1QuantityInPips
        ) = getLiquidityDepositQuantities(
            liquidityDeposit,
            pool.asset0ReserveInPips,
            pool.asset1ReserveInPips
        );

        liquiditySharesMinted = getLiquiditySharesToMint(
            pool,
            asset0QuantityInPips,
            asset1QuantityInPips
        );

        pool.liquiditySharesByWallet[
            liquidityDeposit.walletAddress
        ] += liquiditySharesMinted;
        pool.totalLiquidityShares += liquiditySharesMinted;
        pool.asset0ReserveInPips += asset0QuantityInPips;
        pool.asset1ReserveInPips += asset1QuantityInPips;
    }

    function removeLiquidity(
        Storage storage self,
        AssetRegistry.Storage storage assetRegistry,
        Structs.LiquidityWithdrawal calldata liquidityWithdrawal
    )
        external
        returns (
            address asset0Address,
            address asset1Address,
            uint64 asset0QuantityInPips,
            uint64 asset1QuantityInPips
        )
    {
        LiquidityPool storage pool;
        (pool, asset0Address, asset1Address) = loadLiquidityPoolByAssetSymbols(
            self,
            assetRegistry,
            liquidityWithdrawal.asset0Symbol,
            liquidityWithdrawal.asset1Symbol,
            UUID.getTimestampInMsFromUuidV1(liquidityWithdrawal.nonce)
        );

        (
            asset0QuantityInPips,
            asset1QuantityInPips
        ) = getAssetQuantitiesToRemove(
            pool,
            liquidityWithdrawal.liquiditySharesToBurn
        );

        pool.liquiditySharesByWallet[
            liquidityWithdrawal.walletAddress
        ] -= liquidityWithdrawal.liquiditySharesToBurn;
        pool.totalLiquidityShares -= liquidityWithdrawal.liquiditySharesToBurn;
        pool.asset0ReserveInPips -= asset0QuantityInPips;
        pool.asset1ReserveInPips -= asset1QuantityInPips;
    }

    function getLiquiditySharesToMint(
        LiquidityPool storage pool,
        uint64 asset0QuantityInPips,
        uint64 asset1QuantityInPips
    ) private returns (uint64 liquiditySharesMinted) {
        if (pool.totalLiquidityShares == 0) {
            // This will underflow if the minimum is not being added
            liquiditySharesMinted =
                sqrt(asset0QuantityInPips * asset1QuantityInPips) -
                MINIMUM_LIQUIDITY;
            // Permanently lock the first MINIMUM_LIQUIDITY tokens
            pool.totalLiquidityShares += MINIMUM_LIQUIDITY;
        } else {
            liquiditySharesMinted = min(
                (asset0QuantityInPips * pool.totalLiquidityShares) /
                    pool.asset0ReserveInPips,
                (asset1QuantityInPips * pool.totalLiquidityShares) /
                    pool.asset1ReserveInPips
            );
        }
        require(liquiditySharesMinted > 0, 'Insufficient liquidity minted');
    }

    function getAssetQuantitiesToRemove(
        LiquidityPool storage pool,
        uint64 liquiditySharesToBurn
    )
        private
        view
        returns (uint64 asset0QuantityInPips, uint64 asset1QuantityInPips)
    {
        asset0QuantityInPips =
            (liquiditySharesToBurn * pool.asset0ReserveInPips) /
            pool.totalLiquidityShares;
        asset1QuantityInPips =
            (liquiditySharesToBurn * pool.asset1ReserveInPips) /
            pool.totalLiquidityShares;
        require(
            asset0QuantityInPips > 0 && asset1QuantityInPips > 0,
            'Insufficient liquidity burned'
        );
    }

    function getLiquidityDepositQuantities(
        Structs.LiquidityDeposit memory liquidityDeposit,
        uint64 asset0ReserveInPips,
        uint64 asset1ReserveInPips
    )
        private
        pure
        returns (uint64 asset0QuantityInPips, uint64 asset1QuantityInPips)
    {
        if (asset0ReserveInPips == 0 && asset1ReserveInPips == 0) {
            (asset0QuantityInPips, asset1QuantityInPips) = (
                liquidityDeposit.asset0DesiredQuantityInPips,
                liquidityDeposit.asset1DesiredQuantityInPips
            );
        } else {
            uint64 asset1OptimalQuantityInPips =
                quote(
                    liquidityDeposit.asset0DesiredQuantityInPips,
                    asset0ReserveInPips,
                    asset1ReserveInPips
                );
            if (
                asset1OptimalQuantityInPips <=
                liquidityDeposit.asset1DesiredQuantityInPips
            ) {
                require(
                    asset1OptimalQuantityInPips >=
                        liquidityDeposit.asset1MinimumQuantityInPips,
                    'Insufficient asset1 quantity'
                );
                (asset0QuantityInPips, asset1QuantityInPips) = (
                    liquidityDeposit.asset0DesiredQuantityInPips,
                    asset1OptimalQuantityInPips
                );
            } else {
                uint64 asset0OptimalQuantityInPips =
                    quote(
                        liquidityDeposit.asset1DesiredQuantityInPips,
                        asset1ReserveInPips,
                        asset0ReserveInPips
                    );
                assert(
                    asset0OptimalQuantityInPips <=
                        liquidityDeposit.asset0DesiredQuantityInPips
                );
                require(
                    asset0OptimalQuantityInPips >=
                        liquidityDeposit.asset0MinimumQuantityInPips,
                    'Insufficient asset0 quantity'
                );
                (asset0QuantityInPips, asset1QuantityInPips) = (
                    asset0OptimalQuantityInPips,
                    liquidityDeposit.asset1DesiredQuantityInPips
                );
            }
        }
    }

    function loadLiquidityPoolByAssetSymbols(
        Storage storage self,
        AssetRegistry.Storage storage assetRegistry,
        string memory asset0Symbol,
        string memory asset1Symbol,
        uint64 timestampInMs
    )
        private
        view
        returns (
            LiquidityPool storage pool,
            address asset0Address,
            address asset1Address
        )
    {
        // Resolve assets from symbols and timestamp
        Structs.Asset memory asset0 =
            assetRegistry.loadAssetBySymbol(asset0Symbol, timestampInMs);
        Structs.Asset memory asset1 =
            assetRegistry.loadAssetBySymbol(asset1Symbol, timestampInMs);

        // Resolve pool by sorted addresses
        (asset0Address, asset1Address) = sortAssetAddresses(
            asset0.assetAddress,
            asset1.assetAddress
        );
        pool = self.poolsByAddresses[asset0Address][asset1Address];
        require(pool.exists, 'No pool found for address pair');
    }

    // Given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    function quote(
        uint64 asset0QuantityInPips,
        uint64 asset0ReserveInPips,
        uint64 asset1ReserveInPips
    ) private pure returns (uint64 asset1QuantityInPips) {
        require(asset0QuantityInPips > 0, 'Insufficiant quantity');
        require(
            asset0ReserveInPips > 0 && asset1ReserveInPips > 0,
            'Insufficient liquidity'
        );
        asset1QuantityInPips =
            (asset0QuantityInPips * asset1ReserveInPips) /
            asset0ReserveInPips;
    }

    // Returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortAssetAddresses(address asset0Address, address asset1Address)
        private
        pure
        returns (address sortedAsset0Address, address sortedAsset1Address)
    {
        require(asset0Address != asset1Address, 'Identical asset addresses');
        (sortedAsset0Address, sortedAsset1Address) = asset0Address <
            asset1Address
            ? (asset0Address, asset1Address)
            : (asset1Address, asset0Address);
    }

    function min(uint64 x, uint64 y) private pure returns (uint64 z) {
        z = x < y ? x : y;
    }

    // babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
    function sqrt(uint64 y) private pure returns (uint64 z) {
        if (y > 3) {
            z = y;
            uint64 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
