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
import { UUID } from './UUID.sol';
import { Validations } from './Validations.sol';
import { Withdrawing } from './Withdrawing.sol';
import { Enums, ICustodian, IWETH9, Structs } from './Interfaces.sol';

library LiquidityPoolRegistry {
  using AssetRegistry for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;

  struct Storage {
    mapping(address => mapping(address => Structs.LiquidityPool)) poolsByAddresses;
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
      // To prevent user error, additionaly verify that the provided Pair token address matches
      // that returned by the Factory contract
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
    Structs.LiquidityPool storage pool =
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
      Structs.Asset memory asset;
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
    Structs.LiquidityAddition memory addition,
    address payable custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    require(addition.deadline >= block.timestamp, 'IDEX: EXPIRED');

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

    bytes32 hash = getAdditionHash(addition);
    self.changes[hash] = Enums.LiquidityChangeState.Initiated;
  }

  function addLiquidityETH(
    Storage storage self,
    Structs.LiquidityAddition memory addition,
    address payable custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    require(addition.deadline >= block.timestamp, 'IDEX: EXPIRED');

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

    bytes32 hash = getAdditionHash(addition);
    self.changes[hash] = Enums.LiquidityChangeState.Initiated;
  }

  function executeAddLiquidity(
    Storage storage self,
    Structs.LiquidityAddition memory addition,
    Structs.LiquidityChangeExecution memory execution,
    address feeWallet,
    BalanceTracking.Storage storage balanceTracking
  ) external {
    bytes32 hash = getAdditionHash(addition);
    Enums.LiquidityChangeState state = self.changes[hash];
    require(state == Enums.LiquidityChangeState.Initiated, 'Not executable');
    self.changes[hash] = Enums.LiquidityChangeState.Executed;

    Structs.LiquidityPool storage pool =
      loadLiquidityPoolByAssetAddresses(
        self,
        execution.baseAssetAddress,
        execution.quoteAssetAddress
      );

    (
      uint256 netBaseAssetQuantityInAssetUnits,
      uint256 netQuoteAssetQuantityInAssetUnits
    ) = Validations.validateLiquidityAddition(addition, execution, pool);

    // Debit wallet Pair token balance and credit fee wallet reserve asset balances
    balanceTracking.updateForAddLiquidity(
      addition,
      execution,
      pool.baseAssetDecimals,
      pool.quoteAssetDecimals,
      feeWallet
    );

    // Credit pool base asset reserves with gross deposit minus fees
    uint64 quantityInPips =
      AssetUnitConversions.assetUnitsToPips(
        netBaseAssetQuantityInAssetUnits,
        pool.baseAssetDecimals
      );
    pool.baseAssetReserveInPips += quantityInPips;

    // Credit pool quote asset reserves with gross deposit minus fees
    quantityInPips = AssetUnitConversions.assetUnitsToPips(
      netQuoteAssetQuantityInAssetUnits,
      pool.quoteAssetDecimals
    );
    pool.quoteAssetReserveInPips += quantityInPips;

    // Mint Pair tokens to destination wallet
    pool.pairTokenAddress.hybridMint(
      addition.wallet,
      execution.liquidity,
      // TODO Should this be gross quantity?
      netBaseAssetQuantityInAssetUnits,
      netQuoteAssetQuantityInAssetUnits,
      addition.to
    );
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
    IPair pairTokenAddress =
      validateAndUpdateForLiquidityRemoval(self, removal, execution);

    Withdrawing.withdrawLiquidity(
      removal,
      execution,
      custodian,
      exchangeAddress,
      feeWallet,
      pairTokenAddress,
      assetRegistry,
      balanceTracking
    );
  }

  function validateAndUpdateForLiquidityRemoval(
    Storage storage self,
    Structs.LiquidityRemoval memory removal,
    Structs.LiquidityChangeExecution memory execution
  ) private returns (IPair pairTokenAddress) {
    bytes32 hash = getRemovalHash(removal);
    Enums.LiquidityChangeState state = self.changes[hash];
    require(state == Enums.LiquidityChangeState.Initiated, 'Not executable');
    self.changes[hash] = Enums.LiquidityChangeState.Executed;

    Structs.LiquidityPool storage pool =
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

    pool.pairTokenAddress.hybridBurn(
      removal.wallet,
      execution.liquidity,
      grossBaseAssetQuantityInAssetUnits,
      grossQuoteAssetQuantityInAssetUnits,
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
    Structs.LiquidityPool storage pool =
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

    // Burn deposited Pair tokens
    pool.pairTokenAddress.hybridBurn(
      msg.sender,
      liquidityToBurnInAssetUnits,
      outputBaseAssetQuantityInPips,
      outputQuoteAssetQuantityInPips,
      msg.sender
    );

    Structs.Asset memory asset;
    asset = assetRegistry.loadAssetByAddress(baseAssetAddress);
    outputBaseAssetQuantityInAssetUnits = AssetUnitConversions.pipsToAssetUnits(
      outputBaseAssetQuantityInPips,
      asset.decimals
    );

    asset = assetRegistry.loadAssetByAddress(quoteAssetAddress);
    outputQuoteAssetQuantityInAssetUnits = AssetUnitConversions
      .pipsToAssetUnits(outputQuoteAssetQuantityInPips, asset.decimals);

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
    Structs.PoolTrade memory poolTrade,
    Enums.OrderSide orderSide
  )
    internal
    returns (uint64 baseAssetReserveInPips, uint64 quoteAssetReserveInPips)
  {
    Structs.LiquidityPool storage pool =
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

    return (pool.baseAssetReserveInPips, pool.quoteAssetReserveInPips);
  }

  // Helpers //

  function getOutputAssetQuantities(
    Structs.LiquidityPool storage pool,
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
        pool.pairTokenAddress.decimals()
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

  function getAdditionHash(Structs.LiquidityAddition memory addition)
    private
    pure
    returns (bytes32)
  {
    return
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
  ) internal view returns (Structs.LiquidityPool storage pool) {
    pool = self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
    require(pool.exists, 'No pool found for address pair');
  }

  function min(uint256 x, uint256 y) private pure returns (uint256 z) {
    z = x < y ? x : y;
  }
}
