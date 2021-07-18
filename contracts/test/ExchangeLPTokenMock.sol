// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { ILiquidityProviderToken } from '../libraries/Interfaces.sol';
import { LiquidityProviderToken } from '../LiquidityProviderToken.sol';

contract ExchangeLPTokenMock {
  address _custodian;

  event LPTokenCreated(ILiquidityProviderToken lpToken);

  function createLiquidityProviderToken(
    address baseAssetAddress,
    address quoteAssetAddress,
    string memory baseAssetSymbol,
    string memory quoteAssetSymbol
  ) external returns (ILiquidityProviderToken liquidityProviderToken) {
    // Create an LP token contract tied to this market
    bytes32 salt =
      keccak256(abi.encodePacked(baseAssetAddress, quoteAssetAddress));
    liquidityProviderToken = ILiquidityProviderToken(
      new LiquidityProviderToken{ salt: salt }(
        baseAssetAddress,
        quoteAssetAddress,
        baseAssetSymbol,
        quoteAssetSymbol
      )
    );

    emit LPTokenCreated(liquidityProviderToken);
  }

  function setCustodian(address newCustodian) external {
    _custodian = newCustodian;
  }

  function loadCustodian() external view returns (address) {
    return _custodian;
  }
}
