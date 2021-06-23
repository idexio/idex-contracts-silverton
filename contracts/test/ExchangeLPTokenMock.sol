// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { ILiquidityProviderToken } from '../libraries/Interfaces.sol';
import { LiquidityProviderToken } from '../LiquidityProviderToken.sol';

contract ExchangeLPTokenMock {
  address _custodian;

  event LPTokenCreated(ILiquidityProviderToken lpToken);

  function createLiquidityProviderToken(
    address baseAssetAddress,
    address quoteAssetAddress
  ) external returns (ILiquidityProviderToken liquidityProviderToken) {
    // Create an LP token contract tied to this market
    bytes memory bytecode = type(LiquidityProviderToken).creationCode;
    bytes32 salt =
      keccak256(abi.encodePacked(baseAssetAddress, quoteAssetAddress));
    assembly {
      liquidityProviderToken := create2(
        0,
        add(bytecode, 32),
        mload(bytecode),
        salt
      )
    }
    ILiquidityProviderToken(liquidityProviderToken).initialize(
      baseAssetAddress,
      quoteAssetAddress
    );

    emit LPTokenCreated(liquidityProviderToken);
  }

  function setCustodian(address newCustodian) external {
    _custodian = newCustodian;
  }

  function loadCustodian() external view returns (address) {
    return _custodian;
  }

  function mint(
    ILiquidityProviderToken liquidityProviderToken,
    address wallet,
    uint256 liquidity,
    uint256 baseAssetQuantityInAssetUnits,
    uint256 quoteAssetQuantityInAssetUnits,
    address to
  ) external {
    liquidityProviderToken.mint(
      wallet,
      liquidity,
      baseAssetQuantityInAssetUnits,
      quoteAssetQuantityInAssetUnits,
      to
    );
  }

  function burn(
    ILiquidityProviderToken liquidityProviderToken,
    address wallet,
    uint256 liquidity,
    uint256 baseAssetQuantityInAssetUnits,
    uint256 quoteAssetQuantityInAssetUnits,
    address to
  ) external {
    liquidityProviderToken.burn(
      wallet,
      liquidity,
      baseAssetQuantityInAssetUnits,
      quoteAssetQuantityInAssetUnits,
      to
    );
  }
}
