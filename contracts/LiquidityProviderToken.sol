// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { Address } from '@openzeppelin/contracts/utils/Address.sol';
import { ERC20 } from '@openzeppelin/contracts/token/ERC20/ERC20.sol';

import { Constants } from './libraries/Constants.sol';
import { ICustodian, IExchange, IERC20 } from './libraries/Interfaces.sol';

/**
 * @dev Implementation of the {IERC20} interface.
 *
 * Largely identical to reference OpenZeppelin implementation but allows minting to zero address in
 * order to lock up minimum liquidity amount.
 *
 * see https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol
 */
contract LiquidityProviderToken is ERC20 {
  // Used to whitelist Exchange-only functions by loading address of current Exchange from Custodian
  ICustodian public custodian;
  // Base and quote asset addresses provided only for informational purposes
  address public baseAssetAddress;
  address public quoteAssetAddress;

  event Mint(
    address indexed sender,
    uint256 baseAssetQuantityInAssetUnits,
    uint256 quoteAssetQuantityInAssetUnits
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
    require(address(custodian) != address(0x0), 'Invalid Custodian address');
  }

  function initialize(address _baseAssetAddress, address _quoteAssetAddress)
    external
    onlyExchange
  {
    require(
      _baseAssetAddress != _quoteAssetAddress,
      'Assets must be different'
    );
    require(
      _baseAssetAddress == address(0x0) ||
        Address.isContract(_baseAssetAddress),
      'Invalid base asset'
    );
    require(
      _quoteAssetAddress == address(0x0) ||
        Address.isContract(_quoteAssetAddress),
      'Invalid quote asset'
    );

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

  function reverseAssets() external onlyExchange {
    (baseAssetAddress, quoteAssetAddress) = (
      quoteAssetAddress,
      baseAssetAddress
    );
  }
}
