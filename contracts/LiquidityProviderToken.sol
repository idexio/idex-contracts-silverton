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

  /**
   * @notice Emitted when the Exchange mints new LP tokens to a wallet via `mint`
   */
  event Mint(
    address indexed sender,
    uint256 baseAssetQuantityInAssetUnits,
    uint256 quoteAssetQuantityInAssetUnits
  );
  /**
   * @notice Emitted when the Exchange burns a wallet's LP tokens via `burn`
   */
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

  /**
   * @notice Instantiate a new `LiquidityProviderToken` contract
   *
   * @dev Should be called by the Exchange via a CREATE2 op to generate stable deterministic
   * addresses and setup whitelist for `onlyExchange`-restricted functions. Asset addresses and
   * symbols are stored for informational purposes
   *
   * @param _baseAssetAddress The base asset address
   * @param _quoteAssetAddress The quote asset address
   * @param _baseAssetSymbol The base asset symbol
   * @param _quoteAssetSymbol The quote asset symbol
   */

  constructor(
    address _baseAssetAddress,
    address _quoteAssetAddress,
    string memory _baseAssetSymbol,
    string memory _quoteAssetSymbol
  ) ERC20('', 'IDEX-LP') {
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
   * @notice Returns the name of the token
   */
  function name() public view override returns (string memory) {
    return
      string(
        abi.encodePacked('IDEX LP: ', baseAssetSymbol, '-', quoteAssetSymbol)
      );
  }

  /**
   * @notice Returns the address of the base-quote pair asset with the lower sort order
   */
  function token0() external view override returns (address) {
    return
      baseAssetAddress < quoteAssetAddress
        ? baseAssetAddress
        : quoteAssetAddress;
  }

  /**
   * @notice Returns the address of the base-quote pair asset with the higher sort order
   */
  function token1() external view override returns (address) {
    return
      baseAssetAddress < quoteAssetAddress
        ? quoteAssetAddress
        : baseAssetAddress;
  }

  /**
   * @notice Burns LP tokens by removing them from `wallet`'s balance and total supply
   */
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

  /**
   * @notice Mints LP tokens by adding them to `wallet`'s balance and total supply
   */
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

  /**
   * @notice Reverses the asset pair represented by this token by swapping `baseAssetAddress` with
   * `quoteAssetAddress` and `baseAssetSymbol` with `quoteAssetSymbol`
   */
  function reverseAssets() external override onlyExchange {
    // Assign swapped values to intermediate values first as Solidity won't allow multiple storage
    // writes in a single statement
    (
      address _baseAssetAddress,
      address _quoteAssetAddress,
      string memory _baseAssetSymbol,
      string memory _quoteAssetSymbol
    ) =
      (quoteAssetAddress, baseAssetAddress, quoteAssetSymbol, baseAssetSymbol);
    (baseAssetAddress, quoteAssetAddress, baseAssetSymbol, quoteAssetSymbol) = (
      _baseAssetAddress,
      _quoteAssetAddress,
      _baseAssetSymbol,
      _quoteAssetSymbol
    );
  }
}
