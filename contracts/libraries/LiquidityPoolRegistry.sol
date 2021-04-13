// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import {
  IFactory
} from '@idexio/pancake-swap-core/contracts/interfaces/IFactory.sol';
import {
  IPair
} from '@idexio/pancake-swap-core/contracts/interfaces/IPair.sol';

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { Enums, Structs } from './Interfaces.sol';
import { UUID } from './/UUID.sol';

library LiquidityPoolRegistry {
  using AssetRegistry for AssetRegistry.Storage;

  struct LiquidityPool {
    // Flag to distinguish from empty struct
    bool exists;
    uint64 baseAssetReserveInPips;
    uint64 quoteAssetReserveInPips;
    IPair pairTokenAddress;
  }

  struct Storage {
    mapping(address => mapping(address => LiquidityPool)) poolsByAddresses;
    mapping(bytes32 => Enums.LiquidityChangeState) changes;
  }

  uint64 public constant MINIMUM_LIQUIDITY = 10**3;

  function addLiquidityPool(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    IFactory pairFactoryAddress
  ) external {
    LiquidityPool storage pool =
      self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
    require(!pool.exists, 'Pool already exists');

    IPair pairTokenAddress =
      IPair(pairFactoryAddress.getPair(baseAssetAddress, quoteAssetAddress));
    require(pairTokenAddress != IPair(address(0x0)), 'Pair does not exist');

    pool.pairTokenAddress = pairTokenAddress;
    pool.exists = true;
  }

  function addLiquidity(
    Storage storage self,
    address wallet,
    address tokenA,
    address tokenB,
    uint256 amountADesired,
    uint256 amountBDesired,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
  ) public {
    require(deadline >= block.timestamp, 'IDEX: EXPIRED');

    bytes32 hash =
      keccak256(
        abi.encodePacked(
          uint8(Enums.LiquidityChangeType.Addition),
          wallet,
          tokenA,
          tokenB,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          to,
          deadline
        )
      );
    self.changes[hash] = Enums.LiquidityChangeState.Initiated;
  }

  function addLiquidityETH(
    Storage storage self,
    address wallet,
    uint256 msgValue,
    address token,
    uint256 amountTokenDesired,
    uint256 amountTokenMin,
    uint256 amountETHMin,
    address to,
    uint256 deadline
  ) public {
    require(deadline >= block.timestamp, 'IDEX: EXPIRED');

    bytes32 hash =
      keccak256(
        abi.encodePacked(
          uint8(Enums.LiquidityChangeType.Addition),
          wallet,
          token,
          address(0x0),
          amountTokenDesired,
          msgValue,
          amountTokenMin,
          amountETHMin,
          to,
          deadline
        )
      );
    self.changes[hash] = Enums.LiquidityChangeState.Initiated;
  }

  function executeAddLiquidity(
    Storage storage self,
    AssetRegistry.Storage storage assetRegistry,
    Structs.LiquidityAddition memory addition,
    Structs.LiquidityChangeExecution memory execution
  ) public {
    bytes32 hash =
      keccak256(
        abi.encodePacked(
          uint8(Enums.LiquidityChangeType.Addition),
          addition.wallet,
          addition.assetA,
          addition.assetB,
          addition.amountADesired,
          addition.amountBDesired,
          addition.amountAMin,
          addition.amountBMin,
          addition.to,
          addition.deadline
        )
      );
    Enums.LiquidityChangeState state = self.changes[hash];
    require(state == Enums.LiquidityChangeState.Initiated, 'Not executable');

    (
      uint256 baseAssetQuantityInAssetUnits,
      uint256 quoteAssetQuantityInAssetUnits
    ) =
      execution.baseAssetAddress == addition.assetA
        ? (execution.amountA, execution.amountB)
        : (execution.amountB, execution.amountA);

    LiquidityPool storage pool =
      self.poolsByAddresses[execution.baseAssetAddress][
        execution.quoteAssetAddress
      ];
    require(pool.exists, 'Pool does not exist');

    Structs.Asset memory asset;
    uint64 quantityInPips;

    asset = assetRegistry.loadAssetByAddress(execution.baseAssetAddress);
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      baseAssetQuantityInAssetUnits,
      asset.decimals
    );
    pool.baseAssetReserveInPips += quantityInPips;

    asset = assetRegistry.loadAssetByAddress(execution.quoteAssetAddress);
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      quoteAssetQuantityInAssetUnits,
      asset.decimals
    );
    pool.quoteAssetReserveInPips += quantityInPips;

    pool.pairTokenAddress.hybridMint(addition.to, execution.liquidity);
  }

  function removeLiquidity(
    Storage storage self,
    address wallet,
    address tokenA,
    address tokenB,
    uint256 liquidity,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
  ) public {
    require(deadline >= block.timestamp, 'IDEX: EXPIRED');

    bytes32 hash =
      keccak256(
        abi.encodePacked(
          uint8(Enums.LiquidityChangeType.Removal),
          wallet,
          tokenA,
          tokenB,
          liquidity,
          amountAMin,
          amountBMin,
          to,
          deadline
        )
      );
    self.changes[hash] = Enums.LiquidityChangeState.Initiated;
  }

  function removeLiquidityETH(
    Storage storage self,
    address wallet,
    address token,
    uint256 liquidity,
    uint256 amountTokenMin,
    uint256 amountETHMin,
    address to,
    uint256 deadline
  ) public {
    require(deadline >= block.timestamp, 'IDEX: EXPIRED');

    bytes32 hash =
      keccak256(
        abi.encodePacked(
          uint8(Enums.LiquidityChangeType.Removal),
          wallet,
          token,
          address(0x0),
          liquidity,
          amountTokenMin,
          amountETHMin,
          to,
          deadline
        )
      );
    self.changes[hash] = Enums.LiquidityChangeState.Initiated;
  }

  function executeRemoveLiquidity(
    Storage storage self,
    AssetRegistry.Storage storage assetRegistry,
    Structs.LiquidityRemoval memory removal,
    Structs.LiquidityChangeExecution memory execution
  ) public {
    bytes32 hash =
      keccak256(
        abi.encodePacked(
          uint8(Enums.LiquidityChangeType.Removal),
          removal.wallet,
          removal.assetA,
          removal.assetB,
          removal.liquidity,
          removal.amountAMin,
          removal.amountBMin,
          removal.to,
          removal.deadline
        )
      );
    Enums.LiquidityChangeState state = self.changes[hash];
    require(state == Enums.LiquidityChangeState.Initiated, 'Not executable');

    (
      uint256 baseAssetQuantityInAssetUnits,
      uint256 quoteAssetQuantityInAssetUnits
    ) =
      execution.baseAssetAddress == removal.assetA
        ? (execution.amountA, execution.amountB)
        : (execution.amountB, execution.amountA);

    LiquidityPool storage pool =
      self.poolsByAddresses[execution.baseAssetAddress][
        execution.quoteAssetAddress
      ];
    require(pool.exists, 'Pool does not exist');

    Structs.Asset memory asset;
    uint64 quantityInPips;

    asset = assetRegistry.loadAssetByAddress(execution.baseAssetAddress);
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      baseAssetQuantityInAssetUnits,
      asset.decimals
    );
    pool.baseAssetReserveInPips -= quantityInPips;

    asset = assetRegistry.loadAssetByAddress(execution.quoteAssetAddress);
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      quoteAssetQuantityInAssetUnits,
      asset.decimals
    );
    pool.quoteAssetReserveInPips -= quantityInPips;

    pool.pairTokenAddress.hybridBurn(removal.wallet, execution.liquidity);
  }

  function updateReservesForPoolTrade(
    Storage storage self,
    Structs.PoolTrade memory poolTrade,
    Enums.OrderSide orderSide
  ) public {
    LiquidityPool storage pool =
      loadLiquidityPoolByAssetAddresses(
        self,
        poolTrade.baseAssetAddress,
        poolTrade.quoteAssetAddress
      );

    uint128 initialProduct =
      uint128(pool.baseAssetReserveInPips) *
        uint128(pool.quoteAssetReserveInPips);
    uint128 updatedProduct;

    if (orderSide == Enums.OrderSide.Buy) {
      // Pool gives base asset
      pool.baseAssetReserveInPips -= poolTrade.grossBaseQuantityInPips;
      // Pool receives quote asset
      pool.quoteAssetReserveInPips +=
        poolTrade.grossQuoteQuantityInPips -
        poolTrade.takerProtocolFeeQuantityInPips;

      updatedProduct =
        uint128(pool.baseAssetReserveInPips) *
        uint128(
          pool.quoteAssetReserveInPips - poolTrade.takerPoolFeeQuantityInPips
        );
    } else {
      // Pool receives base asset
      pool.baseAssetReserveInPips +=
        poolTrade.grossBaseQuantityInPips -
        poolTrade.takerProtocolFeeQuantityInPips;
      // Pool gives quote asset
      pool.quoteAssetReserveInPips -= poolTrade.grossQuoteQuantityInPips;

      updatedProduct =
        uint128(
          pool.baseAssetReserveInPips - poolTrade.takerPoolFeeQuantityInPips
        ) *
        uint128(pool.quoteAssetReserveInPips);
    }

    require(
      updatedProduct >= initialProduct,
      'Constant product cannot decrease'
    );
  }

  function loadLiquidityPoolByAssetAddresses(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress
  ) private view returns (LiquidityPool storage pool) {
    pool = self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
    require(pool.exists, 'No pool found for address pair');
  }
}
