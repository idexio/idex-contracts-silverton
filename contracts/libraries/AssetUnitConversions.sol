// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

/**
 * @notice Library helpers for converting asset quantities between asset units and pips
 */
library AssetUnitConversions {
    function pipsToAssetUnits(uint64 quantityInPips, uint8 assetDecimals)
        internal
        pure
        returns (uint256)
    {
        require(assetDecimals <= 32, 'Asset cannot have more than 32 decimals');

        // Exponents cannot be negative, so divide or multiply based on exponent signedness
        if (assetDecimals > 8) {
            return uint256(quantityInPips) * (uint256(10)**(assetDecimals - 8));
        }
        return uint256(quantityInPips) / (uint256(10)**(8 - assetDecimals));
    }

    function assetUnitsToPips(uint256 quantityInAssetUnits, uint8 assetDecimals)
        internal
        pure
        returns (uint64)
    {
        require(assetDecimals <= 32, 'Asset cannot have more than 32 decimals');

        uint256 quantityInPips;
        // Exponents cannot be negative, so divide or multiply based on exponent signedness
        if (assetDecimals > 8) {
            quantityInPips =
                quantityInAssetUnits /
                (uint256(10)**(assetDecimals - 8));
        } else {
            quantityInPips =
                quantityInAssetUnits *
                (uint256(10)**(8 - assetDecimals));
        }
        require(quantityInPips < 2**64, 'Pip quantity overflows uint64');

        return uint64(quantityInPips);
    }
}
