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
        uint64 baseAssetReserveInPips;
        uint64 quoteAssetReserveInPips;
        uint64 totalLiquidityShares;
        mapping(address => uint64) liquiditySharesByWallet;
    }

    struct Storage {
        mapping(address => mapping(address => LiquidityPool)) poolsByAddresses;
    }

    uint64 public constant MINIMUM_LIQUIDITY = 10**3;

    function addLiquidityPool(
        Storage storage self,
        address baseAssetAddress,
        address quoteAssetAddress
    ) external {
        LiquidityPool storage pool =
            self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
        require(!pool.exists, 'Pool already exists');

        pool.exists = true;
    }

    function addLiquidity(
        Storage storage self,
        AssetRegistry.Storage storage assetRegistry,
        Structs.LiquidityDeposit memory liquidityDeposit
    )
        public
        returns (
            address baseAssetAddress,
            address quoteAssetAddress,
            uint64 baseAssetQuantityInPips,
            uint64 quoteAssetQuantityInPips,
            uint64 liquiditySharesMinted
        )
    {
        LiquidityPool storage pool;
        (
            pool,
            baseAssetAddress,
            quoteAssetAddress
        ) = loadLiquidityPoolByAssetSymbols(
            self,
            assetRegistry,
            liquidityDeposit.baseAssetSymbol,
            liquidityDeposit.quoteAssetSymbol,
            UUID.getTimestampInMsFromUuidV1(liquidityDeposit.nonce)
        );

        (
            baseAssetQuantityInPips,
            quoteAssetQuantityInPips
        ) = getLiquidityDepositQuantities(
            liquidityDeposit,
            pool.baseAssetReserveInPips,
            pool.quoteAssetReserveInPips
        );

        liquiditySharesMinted = getLiquiditySharesToMint(
            pool,
            baseAssetQuantityInPips,
            quoteAssetQuantityInPips
        );

        pool.liquiditySharesByWallet[
            liquidityDeposit.walletAddress
        ] += liquiditySharesMinted;
        pool.totalLiquidityShares += liquiditySharesMinted;
        pool.baseAssetReserveInPips += baseAssetQuantityInPips;
        pool.quoteAssetReserveInPips += quoteAssetQuantityInPips;
    }

    function removeLiquidity(
        Storage storage self,
        AssetRegistry.Storage storage assetRegistry,
        Structs.LiquidityWithdrawal calldata liquidityWithdrawal
    )
        external
        returns (
            address baseAssetAddress,
            address quoteAssetAddress,
            uint64 baseAssetQuantityInPips,
            uint64 quoteAssetQuantityInPips
        )
    {
        LiquidityPool storage pool;
        (
            pool,
            baseAssetAddress,
            quoteAssetAddress
        ) = loadLiquidityPoolByAssetSymbols(
            self,
            assetRegistry,
            liquidityWithdrawal.baseAssetSymbol,
            liquidityWithdrawal.quoteAssetSymbol,
            UUID.getTimestampInMsFromUuidV1(liquidityWithdrawal.nonce)
        );

        (
            baseAssetQuantityInPips,
            quoteAssetQuantityInPips
        ) = getAssetQuantitiesToRemove(
            pool,
            liquidityWithdrawal.liquiditySharesToBurn
        );

        pool.liquiditySharesByWallet[
            liquidityWithdrawal.walletAddress
        ] -= liquidityWithdrawal.liquiditySharesToBurn;
        pool.totalLiquidityShares -= liquidityWithdrawal.liquiditySharesToBurn;
        pool.baseAssetReserveInPips -= baseAssetQuantityInPips;
        pool.quoteAssetReserveInPips -= quoteAssetQuantityInPips;
    }

    function getLiquiditySharesToMint(
        LiquidityPool storage pool,
        uint64 baseAssetQuantityInPips,
        uint64 quoteAssetQuantityInPips
    ) private returns (uint64 liquiditySharesMinted) {
        if (pool.totalLiquidityShares == 0) {
            // This will underflow if the minimum is not being added
            liquiditySharesMinted =
                sqrt(
                    uint128(baseAssetQuantityInPips) *
                        uint128(quoteAssetQuantityInPips)
                ) -
                MINIMUM_LIQUIDITY;
            // Permanently lock the first MINIMUM_LIQUIDITY tokens
            pool.totalLiquidityShares += MINIMUM_LIQUIDITY;
        } else {
            liquiditySharesMinted = min(
                (baseAssetQuantityInPips * pool.totalLiquidityShares) /
                    pool.baseAssetReserveInPips,
                (quoteAssetQuantityInPips * pool.totalLiquidityShares) /
                    pool.quoteAssetReserveInPips
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
        returns (
            uint64 baseAssetQuantityInPips,
            uint64 quoteAssetQuantityInPips
        )
    {
        baseAssetQuantityInPips =
            (liquiditySharesToBurn * pool.baseAssetReserveInPips) /
            pool.totalLiquidityShares;
        quoteAssetQuantityInPips =
            (liquiditySharesToBurn * pool.quoteAssetReserveInPips) /
            pool.totalLiquidityShares;
        require(
            baseAssetQuantityInPips > 0 && quoteAssetQuantityInPips > 0,
            'Insufficient liquidity burned'
        );
    }

    function getLiquidityDepositQuantities(
        Structs.LiquidityDeposit memory liquidityDeposit,
        uint64 baseAssetReserveInPips,
        uint64 quoteAssetReserveInPips
    )
        private
        pure
        returns (
            uint64 baseAssetQuantityInPips,
            uint64 quoteAssetQuantityInPips
        )
    {
        if (baseAssetReserveInPips == 0 && quoteAssetReserveInPips == 0) {
            (baseAssetQuantityInPips, quoteAssetQuantityInPips) = (
                liquidityDeposit.baseAssetDesiredQuantityInPips,
                liquidityDeposit.quoteAssetDesiredQuantityInPips
            );
        } else {
            uint64 quoteAssetOptimalQuantityInPips =
                quote(
                    liquidityDeposit.baseAssetDesiredQuantityInPips,
                    baseAssetReserveInPips,
                    quoteAssetReserveInPips
                );
            if (
                quoteAssetOptimalQuantityInPips <=
                liquidityDeposit.quoteAssetDesiredQuantityInPips
            ) {
                require(
                    quoteAssetOptimalQuantityInPips >=
                        liquidityDeposit.quoteAssetMinimumQuantityInPips,
                    'Insufficient quoteAsset quantity'
                );
                (baseAssetQuantityInPips, quoteAssetQuantityInPips) = (
                    liquidityDeposit.baseAssetDesiredQuantityInPips,
                    quoteAssetOptimalQuantityInPips
                );
            } else {
                uint64 baseAssetOptimalQuantityInPips =
                    quote(
                        liquidityDeposit.quoteAssetDesiredQuantityInPips,
                        quoteAssetReserveInPips,
                        baseAssetReserveInPips
                    );
                assert(
                    baseAssetOptimalQuantityInPips <=
                        liquidityDeposit.baseAssetDesiredQuantityInPips
                );
                require(
                    baseAssetOptimalQuantityInPips >=
                        liquidityDeposit.baseAssetMinimumQuantityInPips,
                    'Insufficient baseAsset quantity'
                );
                (baseAssetQuantityInPips, quoteAssetQuantityInPips) = (
                    baseAssetOptimalQuantityInPips,
                    liquidityDeposit.quoteAssetDesiredQuantityInPips
                );
            }
        }
    }

    function loadLiquidityPoolByAssetAddresses(
        Storage storage self,
        address baseAssetAddress,
        address quoteAssetAddress
    ) public view returns (LiquidityPool storage pool) {
        pool = self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
        require(pool.exists, 'No pool found for address pair');
    }

    function loadLiquidityPoolByAssetSymbols(
        Storage storage self,
        AssetRegistry.Storage storage assetRegistry,
        string memory baseAssetSymbol,
        string memory quoteAssetSymbol,
        uint64 timestampInMs
    )
        private
        view
        returns (
            LiquidityPool storage pool,
            address baseAssetAddress,
            address quoteAssetAddress
        )
    {
        // Resolve assets from symbols and timestamp
        Structs.Asset memory baseAsset =
            assetRegistry.loadAssetBySymbol(baseAssetSymbol, timestampInMs);
        Structs.Asset memory quoteAsset =
            assetRegistry.loadAssetBySymbol(quoteAssetSymbol, timestampInMs);

        baseAssetAddress = baseAsset.assetAddress;
        quoteAssetAddress = quoteAsset.assetAddress;
        pool = loadLiquidityPoolByAssetAddresses(
            self,
            baseAssetAddress,
            quoteAssetAddress
        );
    }

    // Given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    function quote(
        uint64 baseAssetQuantityInPips,
        uint64 baseAssetReserveInPips,
        uint64 quoteAssetReserveInPips
    ) private pure returns (uint64 quoteAssetQuantityInPips) {
        require(baseAssetQuantityInPips > 0, 'Insufficient quantity');
        require(
            baseAssetReserveInPips > 0 && quoteAssetReserveInPips > 0,
            'Insufficient liquidity'
        );
        quoteAssetQuantityInPips =
            (baseAssetQuantityInPips * quoteAssetReserveInPips) /
            baseAssetReserveInPips;
    }

    function min(uint64 x, uint64 y) private pure returns (uint64 z) {
        z = x < y ? x : y;
    }

    // babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
    function sqrt(uint128 y) private pure returns (uint64) {
        uint128 z;
        if (y > 3) {
            z = y;
            uint128 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }

        return uint64(z);
    }
}
