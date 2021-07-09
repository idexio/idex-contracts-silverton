// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { Address } from '@openzeppelin/contracts/utils/Address.sol';
import { ERC20 } from '@openzeppelin/contracts/token/ERC20/ERC20.sol';

import { Constants } from './libraries/Constants.sol';
import {
  ICustodian,
  IExchange,
  IERC20,
  ILiquidityProviderToken
} from './libraries/Interfaces.sol';

/**
 * @notice Liquidity Provider ERC-20 token contract
 *
 * @dev Reference OpenZeppelin implementation with whitelisted minting and burning
 */
contract LiquidityProviderToken is ERC20, ILiquidityProviderToken {
  // Used to whitelist Exchange-only functions by loading address of current Exchange from Custodian
  ICustodian public override custodian;
  // Base and quote asset addresses provided only for informational purposes
  address public override baseAssetAddress;
  address public override quoteAssetAddress;
  string public override baseAssetSymbol;
  string public override quoteAssetSymbol;

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

  constructor(
    address _baseAssetAddress,
    address _quoteAssetAddress,
    string memory _baseAssetSymbol,
    string memory _quoteAssetSymbol
  ) ERC20('', '') {
    custodian = IExchange(msg.sender).loadCustodian();
    require(address(custodian) != address(0x0), 'Invalid Custodian address');

    // Assets cannot be equal
    require(
      _baseAssetAddress != _quoteAssetAddress,
      'Assets must be different'
    );

    // Each asset must be the native asset or contract
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
    baseAssetSymbol = _baseAssetSymbol;
    quoteAssetSymbol = _quoteAssetSymbol;
  }

  /**
   * @dev Returns the name of the token.
   */
  function name() public view override returns (string memory) {
    return
      string(
        abi.encodePacked('IDEX HL: ', baseAssetSymbol, '-', quoteAssetSymbol)
      );
  }

  /**
   * @dev Returns the symbol of the token
   * name.
   */
  function symbol() public view override returns (string memory) {
    return
      string(abi.encodePacked('IHL-', baseAssetSymbol, '-', quoteAssetSymbol));
  }

  function token0() external view override returns (address) {
    return
      baseAssetAddress < quoteAssetAddress
        ? baseAssetAddress
        : quoteAssetAddress;
  }

  function token1() external view override returns (address) {
    return
      baseAssetAddress < quoteAssetAddress
        ? quoteAssetAddress
        : baseAssetAddress;
  }

  function burn(
    address wallet,
    uint256 liquidity,
    uint256 baseAssetQuantityInAssetUnits,
    uint256 quoteAssetQuantityInAssetUnits,
    address to
  ) external override onlyExchange {
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
  ) external override onlyExchange {
    _mint(to, liquidity);

    emit Mint(
      wallet,
      baseAssetQuantityInAssetUnits,
      quoteAssetQuantityInAssetUnits
    );
  }

  function reverseAssets() external override onlyExchange {
    (baseAssetAddress, quoteAssetAddress) = (
      quoteAssetAddress,
      baseAssetAddress
    );
  }
}
