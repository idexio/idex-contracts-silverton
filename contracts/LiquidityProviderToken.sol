// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { Address } from '@openzeppelin/contracts/utils/Address.sol';
import { ERC20 } from '@openzeppelin/contracts/token/ERC20/ERC20.sol';

import { ICustodian, IExchange } from './libraries/Interfaces.sol';

contract LiquidityProviderToken is ERC20 {
  ICustodian public custodian;
  address public baseAssetAddress;
  address public quoteAssetAddress;

  event Mint(
    address indexed sender,
    uint256 baseAssetAddress,
    uint256 quoteAssetAddress
  );
  event Burn(
    address indexed sender,
    uint256 baseAssetQuantityInAssetUnits,
    uint256 quoteAssetQuantityInAssetUnits,
    address indexed to
  );

  modifier onlyExchange() {
    require(msg.sender == custodian.loadExchange(), 'Caller is not Exchange');
    _;
  }

  constructor() ERC20('IDEX LPs', 'IDEX-LP') {
    custodian = IExchange(msg.sender).loadCustodian();
  }

  function initialize(address _baseAssetAddress, address _quoteAssetAddress)
    external
    onlyExchange
  {
    require(Address.isContract(_baseAssetAddress), 'Invalid base asset');
    require(Address.isContract(_quoteAssetAddress), 'Invalid quote asset');

    baseAssetAddress = _baseAssetAddress;
    quoteAssetAddress = _quoteAssetAddress;
  }

  function burn(
    address wallet,
    uint256 liquidity,
    uint256 baseAssetQuantityInAssetUnits,
    uint256 quoteAssetQuantityInAssetUnits,
    address to
  ) external onlyExchange {
    _burn(address(custodian), liquidity);
    emit Burn(
      wallet,
      baseAssetQuantityInAssetUnits,
      quoteAssetQuantityInAssetUnits,
      to
    );
  }

  function mint(
    address wallet,
    uint256 liquidity,
    uint256 baseAssetQuantityInAssetUnits,
    uint256 quoteAssetQuantityInAssetUnits,
    address to
  ) external onlyExchange {
    _mint(to, liquidity);
    emit Mint(
      wallet,
      baseAssetQuantityInAssetUnits,
      quoteAssetQuantityInAssetUnits
    );
  }
}
