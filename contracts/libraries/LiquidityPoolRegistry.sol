// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import {
  IFactory
} from '@idexio/pancake-swap-core/contracts/interfaces/IFactory.sol';
import {
  IPair
} from '@idexio/pancake-swap-core/contracts/interfaces/IPair.sol';

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetTransfers } from './AssetTransfers.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { Depositing } from './Depositing.sol';
import { UUID } from './/UUID.sol';
import { Enums, ICustodian, IWETH9, Structs } from './Interfaces.sol';

library LiquidityPoolRegistry {
  using AssetRegistry for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;

  struct LiquidityPool {
    // Flag to distinguish from empty struct
    bool exists;
    uint64 baseAssetReserveInPips;
    uint8 baseAssetDecimals;
    uint64 quoteAssetReserveInPips;
    uint8 quoteAssetDecimals;
    IPair pairTokenAddress;
  }

  struct Storage {
    mapping(address => mapping(address => LiquidityPool)) poolsByAddresses;
    mapping(bytes32 => Enums.LiquidityChangeState) changes;
  }

  uint64 public constant MINIMUM_LIQUIDITY = 10**3;

  // Lifecycle //

  function promotePool(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    IPair pairTokenAddress,
    address payable custodian,
    IFactory pairFactoryAddress,
    IWETH9 WETH,
    AssetRegistry.Storage storage assetRegistry
  ) public {
    {
      // Extra verification to prevent user error
      IPair factoryPairTokenAddress =
        IPair(
          pairFactoryAddress.getPair(
            baseAssetAddress == address(0x0) ? address(WETH) : baseAssetAddress,
            quoteAssetAddress == address(0x0)
              ? address(WETH)
              : quoteAssetAddress
          )
        );
      require(
        factoryPairTokenAddress == pairTokenAddress,
        'Pair does not match factory'
      );
    }

    (uint112 reserve0, uint112 reserve1) = pairTokenAddress.promote();
    // Unwrap WBNB
    if (baseAssetAddress == address(0x0) || quoteAssetAddress == address(0x0)) {
      uint256 ethBalance = IWETH9(WETH).balanceOf(address(this));
      IWETH9(WETH).withdraw(ethBalance);
      AssetTransfers.transferTo(custodian, address(0x0), ethBalance);
    }

    // Create internally tracked pool
    LiquidityPool storage pool =
      self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
    require(!pool.exists, 'Pool already exists');

    pool.pairTokenAddress = pairTokenAddress;
    pool.exists = true;

    {
      // Map reserves to base/quote
      (
        uint256 baseAssetQuantityInAssetUnits,
        uint256 quoteAssetQuantityInAssetUnits
      ) =
        pairTokenAddress.token0() == baseAssetAddress
          ? (reserve0, reserve1)
          : (reserve1, reserve0);

      // Convert reserve amounts to pips and store
      Structs.Asset memory asset;
      asset = assetRegistry.loadAssetByAddress(baseAssetAddress);
      pool.baseAssetDecimals = asset.decimals;
      pool.baseAssetReserveInPips = AssetUnitConversions.assetUnitsToPips(
        baseAssetQuantityInAssetUnits,
        asset.decimals
      );
      asset = assetRegistry.loadAssetByAddress(quoteAssetAddress);
      pool.quoteAssetDecimals = asset.decimals;
      pool.quoteAssetReserveInPips = AssetUnitConversions.assetUnitsToPips(
        quoteAssetQuantityInAssetUnits,
        asset.decimals
      );
    }
  }

  // Add liquidity //

  function addLiquidity(
    Storage storage self,
    address tokenA,
    address tokenB,
    uint256 amountADesired,
    uint256 amountBDesired,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline,
    address payable custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    require(deadline >= block.timestamp, 'IDEX: EXPIRED');

    Depositing.depositLiquidityReserves(
      msg.sender,
      tokenA,
      tokenB,
      amountADesired,
      amountBDesired,
      custodian,
      assetRegistry,
      balanceTracking
    );

    bytes32 hash =
      keccak256(
        abi.encodePacked(
          uint8(Enums.LiquidityChangeType.Addition),
          msg.sender,
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
    address token,
    uint256 amountTokenDesired,
    uint256 amountTokenMin,
    uint256 amountETHMin,
    address to,
    uint256 deadline,
    address payable custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    require(deadline >= block.timestamp, 'IDEX: EXPIRED');

    Depositing.depositLiquidityReserves(
      msg.sender,
      token,
      address(0x0),
      amountTokenDesired,
      msg.value,
      custodian,
      assetRegistry,
      balanceTracking
    );

    bytes32 hash =
      keccak256(
        abi.encodePacked(
          uint8(Enums.LiquidityChangeType.Addition),
          msg.sender,
          token,
          address(0x0),
          amountTokenDesired,
          msg.value,
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
    Structs.LiquidityAddition memory addition,
    Structs.LiquidityChangeExecution memory execution,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) external {
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

    balanceTracking.executeAddLiquidity(
      assetRegistry,
      addition,
      execution,
      feeWallet
    );

    (
      uint256 netBaseAssetQuantityInAssetUnits,
      uint256 netQuoteAssetQuantityInAssetUnits
    ) =
      execution.baseAssetAddress == addition.assetA
        ? (
          execution.amountA - execution.feeAmountA,
          execution.amountB - execution.feeAmountB
        )
        : (
          execution.amountB - execution.feeAmountB,
          execution.amountA - execution.feeAmountA
        );

    LiquidityPool storage pool =
      loadLiquidityPoolByAssetAddresses(
        self,
        execution.baseAssetAddress,
        execution.quoteAssetAddress
      );

    Structs.Asset memory asset;
    uint64 quantityInPips;

    asset = assetRegistry.loadAssetByAddress(execution.baseAssetAddress);
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      netBaseAssetQuantityInAssetUnits,
      asset.decimals
    );
    pool.baseAssetReserveInPips += quantityInPips;

    asset = assetRegistry.loadAssetByAddress(execution.quoteAssetAddress);
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      netQuoteAssetQuantityInAssetUnits,
      asset.decimals
    );
    pool.quoteAssetReserveInPips += quantityInPips;

    pool.pairTokenAddress.hybridMint(addition.to, execution.liquidity);
  }

  // Remove liquidity //

  function removeLiquidity(
    Storage storage self,
    Structs.LiquidityRemoval memory removal,
    address payable custodian,
    IFactory pairFactoryContractAddress,
    address WETH,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    require(removal.deadline >= block.timestamp, 'IDEX: EXPIRED');

    Depositing.depositLiquidityTokens(
      removal.wallet,
      removal.assetA,
      removal.assetB,
      removal.liquidity,
      custodian,
      pairFactoryContractAddress,
      address(WETH),
      assetRegistry,
      balanceTracking
    );

    bytes32 hash = getRemovalHash(removal);
    self.changes[hash] = Enums.LiquidityChangeState.Initiated;
  }

  function executeRemoveLiquidity(
    Storage storage self,
    Structs.LiquidityRemoval memory removal,
    Structs.LiquidityChangeExecution memory execution,
    ICustodian custodian,
    address exchangeAddress,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    LiquidityPool storage pool =
      loadLiquidityPoolByAssetAddresses(
        self,
        execution.baseAssetAddress,
        execution.quoteAssetAddress
      );

    {
      bytes32 hash = getRemovalHash(removal);
      Enums.LiquidityChangeState state = self.changes[hash];
      require(state == Enums.LiquidityChangeState.Initiated, 'Not executable');

      (
        uint256 outputBaseAssetQuantityInAssetUnits,
        uint256 outputQuoteAssetQuantityInAssetUnits
      ) =
        balanceTracking.executeRemoveLiquidity(
          removal,
          execution,
          feeWallet,
          exchangeAddress,
          assetRegistry
        );

      if (outputBaseAssetQuantityInAssetUnits > 0) {
        custodian.withdraw(
          removal.to,
          execution.baseAssetAddress,
          outputBaseAssetQuantityInAssetUnits
        );
      }
      if (outputQuoteAssetQuantityInAssetUnits > 0) {
        custodian.withdraw(
          removal.to,
          execution.quoteAssetAddress,
          outputQuoteAssetQuantityInAssetUnits
        );
      }
    }

    {
      (
        uint256 baseAssetQuantityInAssetUnits,
        uint256 quoteAssetQuantityInAssetUnits
      ) =
        execution.baseAssetAddress == removal.assetA
          ? (execution.amountA, execution.amountB)
          : (execution.amountB, execution.amountA);

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

      balanceTracking.burnLiquidityTokens(
        address(pool.pairTokenAddress),
        removal.wallet,
        execution.liquidity
      );
    }
  }

  // Exit liquidity //

  function removeLiquidityExit(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    ICustodian custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  )
    external
    returns (
      uint256 outputBaseAssetQuantityInAssetUnits,
      uint256 outputQuoteAssetQuantityInAssetUnits
    )
  {
    LiquidityPool storage pool =
      loadLiquidityPoolByAssetAddresses(
        self,
        baseAssetAddress,
        quoteAssetAddress
      );

    uint64 liquidityToBurnInPips =
      balanceTracking.updateForExit(msg.sender, address(pool.pairTokenAddress));
    uint256 liquidityToBurnInAssetUnits =
      AssetUnitConversions.pipsToAssetUnits(
        liquidityToBurnInPips,
        pool.pairTokenAddress.decimals()
      );

    (
      uint64 outputBaseAssetQuantityInPips,
      uint64 outputQuoteAssetQuantityInPips
    ) = getOutputAssetQuantities(pool, liquidityToBurnInPips);
    pool.baseAssetReserveInPips -= outputBaseAssetQuantityInPips;
    pool.quoteAssetReserveInPips -= outputQuoteAssetQuantityInPips;

    pool.pairTokenAddress.hybridBurn(msg.sender, liquidityToBurnInAssetUnits);

    Structs.Asset memory asset;
    asset = assetRegistry.loadAssetByAddress(baseAssetAddress);
    outputBaseAssetQuantityInAssetUnits = AssetUnitConversions.pipsToAssetUnits(
      outputBaseAssetQuantityInPips,
      asset.decimals
    );

    asset = assetRegistry.loadAssetByAddress(quoteAssetAddress);
    outputQuoteAssetQuantityInAssetUnits = AssetUnitConversions
      .pipsToAssetUnits(outputQuoteAssetQuantityInPips, asset.decimals);

    custodian.withdraw(
      payable(msg.sender),
      baseAssetAddress,
      outputBaseAssetQuantityInAssetUnits
    );
    custodian.withdraw(
      payable(msg.sender),
      quoteAssetAddress,
      outputQuoteAssetQuantityInAssetUnits
    );
  }

  // Trading //

  function updateReservesForPoolTrade(
    Storage storage self,
    Structs.PoolTrade memory poolTrade,
    Enums.OrderSide orderSide
  ) internal {
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

  // Helpers //

  function getOutputAssetQuantities(
    LiquidityPool storage pool,
    uint64 liquidityToBurnInPips
  )
    internal
    view
    returns (
      uint64 outputBaseAssetQuantityInPips,
      uint64 outputQuoteAssetQuantityInPips
    )
  {
    // Convert total LP supply to pips to calculate ratios
    uint64 totalLiquidityInPips =
      AssetUnitConversions.assetUnitsToPips(
        pool.pairTokenAddress.totalSupply(),
        pool.pairTokenAddress.decimals()
      );

    outputBaseAssetQuantityInPips =
      (liquidityToBurnInPips * pool.baseAssetReserveInPips) /
      totalLiquidityInPips;
    outputQuoteAssetQuantityInPips =
      (liquidityToBurnInPips * pool.quoteAssetReserveInPips) /
      totalLiquidityInPips;
    require(
      outputBaseAssetQuantityInPips > 0 && outputQuoteAssetQuantityInPips > 0,
      'Insufficient liquidity burned'
    );
  }

  function getRemovalHash(Structs.LiquidityRemoval memory removal)
    private
    pure
    returns (bytes32)
  {
    return
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
  }

  function loadLiquidityPoolByAssetAddresses(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress
  ) internal view returns (LiquidityPool storage pool) {
    pool = self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
    require(pool.exists, 'No pool found for address pair');
  }
}
