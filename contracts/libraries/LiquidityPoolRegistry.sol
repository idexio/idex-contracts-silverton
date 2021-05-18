// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import {
  IIDEXFactory
} from '@idexio/idex-swap-core/contracts/interfaces/IIDEXFactory.sol';
import {
  IIDEXPair
} from '@idexio/idex-swap-core/contracts/interfaces/IIDEXPair.sol';

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetTransfers } from './AssetTransfers.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { Constants } from './Constants.sol';
import { Depositing } from './Depositing.sol';
import { Hashing } from './Hashing.sol';
import { PoolTradeHelpers } from './PoolTradeHelpers.sol';
import { Validations } from './Validations.sol';
import { Withdrawing } from './Withdrawing.sol';
import { ICustodian, IWETH9 } from './Interfaces.sol';
import {
  LiquidityChangeOrigination,
  LiquidityChangeState,
  LiquidityChangeType,
  OrderSide
} from './Enums.sol';
import {
  Asset,
  LiquidityAddition,
  LiquidityChangeExecution,
  LiquidityPool,
  LiquidityRemoval,
  PoolTrade
} from './Structs.sol';

library LiquidityPoolRegistry {
  using AssetRegistry for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;
  using PoolTradeHelpers for PoolTrade;

  struct Storage {
    mapping(address => mapping(address => LiquidityPool)) poolsByAddresses;
    mapping(bytes32 => LiquidityChangeState) changes;
  }

  uint64 public constant MINIMUM_LIQUIDITY = 10**3;

  // Lifecycle //

  function promotePool(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    IIDEXPair pairTokenAddress,
    ICustodian custodian,
    IIDEXFactory pairFactoryAddress,
    IWETH9 WETH,
    AssetRegistry.Storage storage assetRegistry
  ) public {
    {
      // To prevent user error, additionaly verify that the provided Pair token address matches
      // that returned by the Factory contract
      IIDEXPair factoryPairTokenAddress =
        IIDEXPair(
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

    // Promote pool to hybrid and transfer token reserves to Exchange
    (address token0, address token1, uint112 reserve0, uint112 reserve1) =
      pairTokenAddress.promote();
    // Transfer reserves to Custodian and unwrap WBNB if needed
    transferTokenReserveToCustodian(token0, reserve0, custodian, WETH);
    transferTokenReserveToCustodian(token1, reserve1, custodian, WETH);

    // Create internally tracked pool
    LiquidityPool storage pool =
      self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
    require(!pool.exists, 'Pool already exists');
    pool.pairTokenAddress = pairTokenAddress;
    pool.exists = true;

    {
      // Map Pair token reserve addresses to provided market base/quote addresses
      (
        uint256 baseAssetQuantityInAssetUnits,
        uint256 quoteAssetQuantityInAssetUnits
      ) =
        pairTokenAddress.token0() == baseAssetAddress
          ? (reserve0, reserve1)
          : (reserve1, reserve0);

      // Convert transferred reserve amounts to pips and store
      Asset memory asset;
      asset = assetRegistry.loadAssetByAddress(baseAssetAddress);
      // Store asset decimals to avoid redundant asset registry lookups
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
    LiquidityAddition memory addition,
    ICustodian custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    require(addition.deadline >= block.timestamp, 'IDEX: EXPIRED');

    bytes32 hash = Hashing.getLiquidityAdditionHash(addition);
    require(
      self.changes[hash] == LiquidityChangeState.NotInitiated,
      'Already initiated'
    );
    self.changes[hash] = LiquidityChangeState.Initiated;

    // Transfer assets to Custodian and credit balances
    Depositing.depositLiquidityReserves(
      addition.wallet,
      addition.assetA,
      addition.assetB,
      addition.amountADesired,
      addition.amountBDesired,
      custodian,
      assetRegistry,
      balanceTracking
    );
  }

  function addLiquidityETH(
    Storage storage self,
    LiquidityAddition memory addition,
    ICustodian custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    require(addition.deadline >= block.timestamp, 'IDEX: EXPIRED');

    bytes32 hash = Hashing.getLiquidityAdditionHash(addition);
    require(
      self.changes[hash] == LiquidityChangeState.NotInitiated,
      'Already initiated'
    );
    self.changes[hash] = LiquidityChangeState.Initiated;

    // Transfer reserve assets to Custodian and credit balances
    Depositing.depositLiquidityReserves(
      addition.wallet,
      addition.assetA,
      addition.assetB,
      addition.amountADesired,
      addition.amountBDesired,
      custodian,
      assetRegistry,
      balanceTracking
    );
  }

  function executeAddLiquidity(
    Storage storage self,
    LiquidityAddition memory addition,
    LiquidityChangeExecution memory execution,
    address feeWallet,
    address custodianAddress,
    BalanceTracking.Storage storage balanceTracking
  ) external {
    (
      IIDEXPair pairTokenAddress,
      uint8 baseAssetDecimals,
      uint8 quoteAssetDecimals
    ) = validateAndUpdateForLiquidityAddition(self, addition, execution);

    // Debit wallet Pair token balance and credit fee wallet reserve asset balances
    balanceTracking.updateForAddLiquidity(
      addition,
      execution,
      baseAssetDecimals,
      quoteAssetDecimals,
      feeWallet,
      custodianAddress,
      pairTokenAddress
    );
  }

  function validateAndUpdateForLiquidityAddition(
    Storage storage self,
    LiquidityAddition memory addition,
    LiquidityChangeExecution memory execution
  )
    private
    returns (
      IIDEXPair pairTokenAddress,
      uint8 baseAssetDecimals,
      uint8 quoteAssetDecimals
    )
  {
    {
      bytes32 hash = Hashing.getLiquidityAdditionHash(addition);
      if (addition.origination == LiquidityChangeOrigination.OnChain) {
        LiquidityChangeState state = self.changes[hash];
        require(state == LiquidityChangeState.Initiated, 'Not executable');
      } else {
        require(
          Hashing.isSignatureValid(hash, addition.signature, addition.wallet),
          'Invalid signature'
        );
      }
      self.changes[hash] = LiquidityChangeState.Executed;
    }

    LiquidityPool storage pool =
      loadLiquidityPoolByAssetAddresses(
        self,
        execution.baseAssetAddress,
        execution.quoteAssetAddress
      );
    pairTokenAddress = pool.pairTokenAddress;
    baseAssetDecimals = pool.baseAssetDecimals;
    quoteAssetDecimals = pool.quoteAssetDecimals;

    (
      uint256 netBaseAssetQuantityInAssetUnits,
      uint256 netQuoteAssetQuantityInAssetUnits
    ) = Validations.validateLiquidityAddition(addition, execution, pool);

    {
      // Credit pool base asset reserves with gross deposit minus fees
      uint64 quantityInPips =
        AssetUnitConversions.assetUnitsToPips(
          netBaseAssetQuantityInAssetUnits,
          baseAssetDecimals
        );
      pool.baseAssetReserveInPips += quantityInPips;

      // Credit pool quote asset reserves with gross deposit minus fees
      quantityInPips = AssetUnitConversions.assetUnitsToPips(
        netQuoteAssetQuantityInAssetUnits,
        quoteAssetDecimals
      );
      pool.quoteAssetReserveInPips += quantityInPips;
    }

    // Mint Pair tokens to destination wallet
    (uint256 amount0, uint256 amount1) =
      execution.baseAssetAddress == pairTokenAddress.token0()
        ? (netBaseAssetQuantityInAssetUnits, netQuoteAssetQuantityInAssetUnits)
        : (netQuoteAssetQuantityInAssetUnits, netBaseAssetQuantityInAssetUnits);
    pairTokenAddress.hybridMint(
      addition.wallet,
      execution.liquidity,
      amount0,
      amount1,
      addition.to
    );
  }

  // Remove liquidity //

  function removeLiquidity(
    Storage storage self,
    LiquidityRemoval memory removal,
    ICustodian custodian,
    IIDEXFactory pairFactoryContractAddress,
    address WETH,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    require(removal.deadline >= block.timestamp, 'IDEX: EXPIRED');

    bytes32 hash = Hashing.getLiquidityRemovalHash(removal);
    require(
      self.changes[hash] == LiquidityChangeState.NotInitiated,
      'Already initiated'
    );
    self.changes[hash] = LiquidityChangeState.Initiated;

    // Transfer Pair tokens to Custodian and credit balances
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
  }

  function executeRemoveLiquidity(
    Storage storage self,
    LiquidityRemoval memory removal,
    LiquidityChangeExecution memory execution,
    ICustodian custodian,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    IIDEXPair pairTokenAddress =
      validateAndUpdateForLiquidityRemoval(self, removal, execution);

    Withdrawing.withdrawLiquidity(
      removal,
      execution,
      custodian,
      feeWallet,
      pairTokenAddress,
      assetRegistry,
      balanceTracking
    );
  }

  function validateAndUpdateForLiquidityRemoval(
    Storage storage self,
    LiquidityRemoval memory removal,
    LiquidityChangeExecution memory execution
  ) private returns (IIDEXPair pairTokenAddress) {
    bytes32 hash = Hashing.getLiquidityRemovalHash(removal);
    if (removal.origination == LiquidityChangeOrigination.OnChain) {
      LiquidityChangeState state = self.changes[hash];
      require(state == LiquidityChangeState.Initiated, 'Not executable');
    } else {
      require(
        Hashing.isSignatureValid(hash, removal.signature, removal.wallet),
        'Invalid signature'
      );
    }
    self.changes[hash] = LiquidityChangeState.Executed;

    LiquidityPool storage pool =
      loadLiquidityPoolByAssetAddresses(
        self,
        execution.baseAssetAddress,
        execution.quoteAssetAddress
      );
    pairTokenAddress = pool.pairTokenAddress;

    (
      uint256 grossBaseAssetQuantityInAssetUnits,
      uint256 grossQuoteAssetQuantityInAssetUnits
    ) = Validations.validateLiquidityRemoval(removal, execution, pool);

    // Debit pool base asset reserves with gross withdrawal
    uint64 quantityInPips =
      AssetUnitConversions.assetUnitsToPips(
        grossBaseAssetQuantityInAssetUnits,
        pool.baseAssetDecimals
      );
    pool.baseAssetReserveInPips -= quantityInPips;

    // Debit pool quote asset reserves with gross withdrawal
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      grossQuoteAssetQuantityInAssetUnits,
      pool.quoteAssetDecimals
    );
    pool.quoteAssetReserveInPips -= quantityInPips;

    (uint256 amount0, uint256 amount1) =
      execution.baseAssetAddress == pairTokenAddress.token0()
        ? (
          grossBaseAssetQuantityInAssetUnits,
          grossQuoteAssetQuantityInAssetUnits
        )
        : (
          grossQuoteAssetQuantityInAssetUnits,
          grossBaseAssetQuantityInAssetUnits
        );
    pool.pairTokenAddress.hybridBurn(
      removal.wallet,
      execution.liquidity,
      amount0,
      amount1,
      removal.to
    );
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
        Constants.pairTokenDecimals
      );

    (
      uint64 outputBaseAssetQuantityInPips,
      uint64 outputQuoteAssetQuantityInPips
    ) = getOutputAssetQuantities(pool, liquidityToBurnInPips);
    pool.baseAssetReserveInPips -= outputBaseAssetQuantityInPips;
    pool.quoteAssetReserveInPips -= outputQuoteAssetQuantityInPips;

    Asset memory asset;
    asset = assetRegistry.loadAssetByAddress(baseAssetAddress);
    outputBaseAssetQuantityInAssetUnits = AssetUnitConversions.pipsToAssetUnits(
      outputBaseAssetQuantityInPips,
      asset.decimals
    );

    asset = assetRegistry.loadAssetByAddress(quoteAssetAddress);
    outputQuoteAssetQuantityInAssetUnits = AssetUnitConversions
      .pipsToAssetUnits(outputQuoteAssetQuantityInPips, asset.decimals);

    // Burn deposited Pair tokens
    pool.pairTokenAddress.hybridBurn(
      msg.sender,
      liquidityToBurnInAssetUnits,
      outputBaseAssetQuantityInAssetUnits,
      outputQuoteAssetQuantityInAssetUnits,
      msg.sender
    );

    // Transfer reserve assets to wallet
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
    PoolTrade memory poolTrade,
    OrderSide orderSide
  )
    internal
    returns (uint64 baseAssetReserveInPips, uint64 quoteAssetReserveInPips)
  {
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

    if (orderSide == OrderSide.Buy) {
      pool.baseAssetReserveInPips -= poolTrade.poolDebitQuantityInPips(
        orderSide
      );
      pool.quoteAssetReserveInPips += poolTrade.poolCreditQuantityInPips(
        orderSide
      );

      updatedProduct =
        uint128(pool.baseAssetReserveInPips) *
        uint128(
          pool.quoteAssetReserveInPips - poolTrade.totalInputFeeQuantityInPips()
        );
    } else {
      pool.baseAssetReserveInPips += poolTrade.poolCreditQuantityInPips(
        orderSide
      );
      pool.quoteAssetReserveInPips -= poolTrade.poolDebitQuantityInPips(
        orderSide
      );

      updatedProduct =
        uint128(
          pool.baseAssetReserveInPips - poolTrade.totalInputFeeQuantityInPips()
        ) *
        uint128(pool.quoteAssetReserveInPips);
    }

    require(
      updatedProduct >= initialProduct,
      'Constant product cannot decrease'
    );

    return (pool.baseAssetReserveInPips, pool.quoteAssetReserveInPips);
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
    // Convert total Pair token supply to pips to calculate ratios
    uint64 totalLiquidityInPips =
      AssetUnitConversions.assetUnitsToPips(
        pool.pairTokenAddress.totalSupply(),
        Constants.pairTokenDecimals
      );

    // https://github.com/Uniswap/uniswap-v2-core/blob/master/contracts/UniswapV2Pair.sol#L123
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

  function loadLiquidityPoolByAssetAddresses(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress
  ) internal view returns (LiquidityPool storage pool) {
    pool = self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
    require(pool.exists, 'No pool found for address pair');
  }

  function transferTokenReserveToCustodian(
    address token,
    uint112 reserve,
    ICustodian custodian,
    IWETH9 WETH
  ) private {
    // Unwrap WBNB
    if (token == address(WETH)) {
      WETH.withdraw(reserve);
      AssetTransfers.transferTo(
        payable(address(custodian)),
        address(0x0),
        reserve
      );
    } else {
      AssetTransfers.transferTo(payable(address(custodian)), token, reserve);
    }
  }
}
