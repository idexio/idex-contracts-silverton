// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { ERC20 } from '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract FaucetToken is ERC20 {
  string private _name;
  string private _symbol;
  uint8 private _decimals;
  uint256 private _maximumSupply;
  uint256 private _numTokensReleasedByFaucet;

  uint256 constant INITIAL_SUPPLY = 10**12;
  uint256 constant MAX_SUPPLY = 10**15;

  constructor(
    string memory name_,
    string memory symbol_,
    uint8 decimals_,
    uint256 numTokensReleasedByFaucet
  ) ERC20('', '') {
    _name = name_;
    _symbol = symbol_;
    _decimals = decimals_;

    _numTokensReleasedByFaucet =
      numTokensReleasedByFaucet *
      10**uint256(decimals_);
    _maximumSupply = MAX_SUPPLY * 10**uint256(decimals_);

    _mint(msg.sender, INITIAL_SUPPLY * 10**uint256(decimals_));
  }

  function name() public view virtual override returns (string memory) {
    return _name;
  }

  function symbol() public view virtual override returns (string memory) {
    return _symbol;
  }

  function decimals() public view virtual override returns (uint8) {
    return _decimals;
  }

  function faucet(address wallet) public {
    require(wallet != address(0), 'Invalid wallet');
    require(totalSupply() < _maximumSupply, 'Max supply exceeded');

    _mint(wallet, _numTokensReleasedByFaucet);
  }
}
