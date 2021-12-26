// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.10;

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetTransfers } from './AssetTransfers.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { Constants } from './Constants.sol';
import { Depositing } from './Depositing.sol';
import { Hashing } from './Hashing.sol';
import {
  LiquidityChangeExecutionValidations
} from './LiquidityChangeExecutionValidations.sol';
import { LiquidityPoolHelpers } from './LiquidityPoolHelpers.sol';
import { LiquidityProviderToken } from '../LiquidityProviderToken.sol';
import { PoolTradeHelpers } from './PoolTradeHelpers.sol';
import { Validations } from './Validations.sol';
import { Withdrawing } from './Withdrawing.sol';
import {
  ICustodian,
  IERC20,
  ILiquidityProviderToken,
  IWETH9
} from './Interfaces.sol';
import {
  LiquidityChangeOrigination,
  LiquidityChangeState,
  LiquidityChangeType,
  OrderSide
} from './Enums.sol';
import {
  Asset,
  LiquidityAddition,
  LiquidityAdditionDepositResult,
  LiquidityChangeExecution,
  LiquidityPool,
  LiquidityRemoval,
  LiquidityRemovalDepositResult,
  PoolTrade
} from './Structs.sol';

library LiquidityPools {
  using AssetRegistry for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;
  using LiquidityPoolHelpers for LiquidityPool;
  using PoolTradeHelpers for PoolTrade;

  struct Storage {
    mapping(address => mapping(address => ILiquidityProviderToken)) liquidityProviderTokensByAddress;
    mapping(address => mapping(address => LiquidityPool)) poolsByAddresses;
    mapping(bytes32 => LiquidityChangeState) changes;
  }

  uint64 public constant MINIMUM_LIQUIDITY = 10**3;

  // Add liquidity //

  function addLiquidity(
    Storage storage self,
    LiquidityAddition memory addition,
    ICustodian custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public returns (LiquidityAdditionDepositResult memory) {
    require(addition.deadline >= block.timestamp, 'IDEX: EXPIRED');

    bytes32 hash = Hashing.getLiquidityAdditionHash(addition);
    require(
      self.changes[hash] == LiquidityChangeState.NotInitiated,
      'Already initiated'
    );
    self.changes[hash] = LiquidityChangeState.Initiated;

    // Transfer assets to Custodian and credit balances
    return
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
    ILiquidityProviderToken liquidityProviderToken =
      validateAndUpdateForLiquidityAddition(self, addition, execution);

    // Debit wallet Pair token balance and credit fee wallet reserve asset balances
    balanceTracking.updateForAddLiquidity(
      addition,
      execution,
      feeWallet,
      custodianAddress,
      liquidityProviderToken
    );
  }

  function validateAndUpdateForLiquidityAddition(
    Storage storage self,
    LiquidityAddition memory addition,
    LiquidityChangeExecution memory execution
  ) private returns (ILiquidityProviderToken liquidityProviderToken) {
    {
      bytes32 hash = Hashing.getLiquidityAdditionHash(addition);
      LiquidityChangeState state = self.changes[hash];

      if (addition.origination == LiquidityChangeOrigination.OnChain) {
        require(
          state == LiquidityChangeState.Initiated,
          'Not executable from on-chain'
        );
      } else {
        require(
          state == LiquidityChangeState.NotInitiated,
          'Not executable from off-chain'
        );
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
    liquidityProviderToken = pool.liquidityProviderToken;

    LiquidityChangeExecutionValidations.validateLiquidityAddition(
      addition,
      execution,
      pool
    );

    validateAndUpdateReservesForLiquidityAddition(pool, execution);

    // Mint LP tokens to destination wallet
    liquidityProviderToken.mint(
      addition.wallet,
      AssetUnitConversions.pipsToAssetUnits(
        execution.liquidityInPips,
        Constants.liquidityProviderTokenDecimals
      ),
      AssetUnitConversions.pipsToAssetUnits(
        execution.netBaseQuantityInPips,
        pool.baseAssetDecimals
      ),
      AssetUnitConversions.pipsToAssetUnits(
        execution.netQuoteQuantityInPips,
        pool.quoteAssetDecimals
      ),
      addition.to
    );
  }

  // Remove liquidity //

  function removeLiquidity(
    Storage storage self,
    LiquidityRemoval memory removal,
    ICustodian custodian,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public returns (LiquidityRemovalDepositResult memory) {
    require(removal.deadline >= block.timestamp, 'IDEX: EXPIRED');

    bytes32 hash = Hashing.getLiquidityRemovalHash(removal);
    require(
      self.changes[hash] == LiquidityChangeState.NotInitiated,
      'Already initiated'
    );
    self.changes[hash] = LiquidityChangeState.Initiated;

    // Resolve LP token address
    address liquidityProviderToken =
      address(
        loadLiquidityProviderTokenByAssetAddresses(
          self,
          removal.assetA,
          removal.assetB
        )
      );

    // Transfer LP tokens to Custodian and credit balances
    return
      Depositing.depositLiquidityTokens(
        removal.wallet,
        liquidityProviderToken,
        removal.liquidity,
        custodian,
        assetRegistry,
        balanceTracking
      );
  }

  function executeRemoveLiquidity(
    Storage storage self,
    LiquidityRemoval memory removal,
    LiquidityChangeExecution memory execution,
    bool isWalletExited,
    ICustodian custodian,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    ILiquidityProviderToken liquidityProviderToken =
      validateAndUpdateForLiquidityRemoval(
        self,
        removal,
        execution,
        isWalletExited
      );

    Withdrawing.withdrawLiquidity(
      removal,
      execution,
      custodian,
      feeWallet,
      liquidityProviderToken,
      assetRegistry,
      balanceTracking
    );
  }

  function validateAndUpdateForLiquidityRemoval(
    Storage storage self,
    LiquidityRemoval memory removal,
    LiquidityChangeExecution memory execution,
    bool isWalletExited
  ) private returns (ILiquidityProviderToken liquidityProviderToken) {
    {
      // Following a wallet exit the Dispatcher can liquidate the wallet's liquidity pool positions
      // without the need for the wallet itself to first initiate the removal. Without this
      // mechanism, the wallet could change the pool's price at any time following the exit by
      // calling `removeLiquidityExit` and cause the reversion of pending pool settlements from the
      // Dispatcher
      if (!isWalletExited) {
        bytes32 hash = Hashing.getLiquidityRemovalHash(removal);
        LiquidityChangeState state = self.changes[hash];

        if (removal.origination == LiquidityChangeOrigination.OnChain) {
          require(
            state == LiquidityChangeState.Initiated,
            'Not executable from on-chain'
          );
        } else {
          require(
            state == LiquidityChangeState.NotInitiated,
            'Not executable from off-chain'
          );
          require(
            Hashing.isSignatureValid(hash, removal.signature, removal.wallet),
            'Invalid signature'
          );
        }
        self.changes[hash] = LiquidityChangeState.Executed;
      }
    }

    LiquidityPool storage pool =
      loadLiquidityPoolByAssetAddresses(
        self,
        execution.baseAssetAddress,
        execution.quoteAssetAddress
      );
    liquidityProviderToken = pool.liquidityProviderToken;

    LiquidityChangeExecutionValidations.validateLiquidityRemoval(
      removal,
      execution,
      pool
    );

    uint64 initialPrice = pool.calculateCurrentPoolPriceInPips();

    // Debit pool reserves
    pool.baseAssetReserveInPips -= execution.grossBaseQuantityInPips;
    pool.quoteAssetReserveInPips -= execution.grossQuoteQuantityInPips;

    uint64 updatedPrice = pool.calculateCurrentPoolPriceInPips();
    // Skip price validation if 1) emptying a pool of all liquidity since the price can validly
    // change to zero or 2) either reserve is below the minimum as prices can no longer be
    // represented with full pip precision
    if (
      updatedPrice > 0 &&
      pool.baseAssetReserveInPips >= Constants.minLiquidityPoolReserveInPips &&
      pool.quoteAssetReserveInPips >= Constants.minLiquidityPoolReserveInPips
    ) {
      require(initialPrice == updatedPrice, 'Pool price cannot change');
    }

    liquidityProviderToken.burn(
      removal.wallet,
      AssetUnitConversions.pipsToAssetUnits(
        execution.liquidityInPips,
        Constants.liquidityProviderTokenDecimals
      ),
      AssetUnitConversions.pipsToAssetUnits(
        execution.grossBaseQuantityInPips,
        pool.baseAssetDecimals
      ),
      AssetUnitConversions.pipsToAssetUnits(
        execution.grossQuoteQuantityInPips,
        pool.quoteAssetDecimals
      ),
      removal.to
    );
  }

  // Exit liquidity //

  function removeLiquidityExit(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    ICustodian custodian,
    BalanceTracking.Storage storage balanceTracking
  )
    public
    returns (
      uint64 outputBaseAssetQuantityInPips,
      uint64 outputQuoteAssetQuantityInPips
    )
  {
    LiquidityPool storage pool =
      loadLiquidityPoolByAssetAddresses(
        self,
        baseAssetAddress,
        quoteAssetAddress
      );

    uint64 liquidityToBurnInPips =
      balanceTracking.updateForExit(
        msg.sender,
        address(pool.liquidityProviderToken)
      );

    // Calculate output asset quantities
    (outputBaseAssetQuantityInPips, outputQuoteAssetQuantityInPips) = pool
      .calculateOutputAssetQuantitiesInPips(liquidityToBurnInPips);
    uint256 outputBaseAssetQuantityInAssetUnits =
      AssetUnitConversions.pipsToAssetUnits(
        outputBaseAssetQuantityInPips,
        pool.baseAssetDecimals
      );
    uint256 outputQuoteAssetQuantityInAssetUnits =
      AssetUnitConversions.pipsToAssetUnits(
        outputQuoteAssetQuantityInPips,
        pool.quoteAssetDecimals
      );

    // Debit pool reserves
    pool.baseAssetReserveInPips -= outputBaseAssetQuantityInPips;
    pool.quoteAssetReserveInPips -= outputQuoteAssetQuantityInPips;

    // Burn deposited Pair tokens
    pool.liquidityProviderToken.burn(
      msg.sender,
      AssetUnitConversions.pipsToAssetUnits(
        liquidityToBurnInPips,
        Constants.liquidityProviderTokenDecimals
      ),
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
      pool.baseAssetReserveInPips -= poolTrade.getPoolDebitQuantityInPips(
        orderSide
      );
      pool.quoteAssetReserveInPips += poolTrade
        .calculatePoolCreditQuantityInPips(orderSide);

      updatedProduct =
        uint128(pool.baseAssetReserveInPips) *
        uint128(
          pool.quoteAssetReserveInPips - poolTrade.takerPoolFeeQuantityInPips
        );
    } else {
      pool.baseAssetReserveInPips += poolTrade
        .calculatePoolCreditQuantityInPips(orderSide);
      if (poolTrade.takerPriceCorrectionFeeQuantityInPips > 0) {
        // Add the taker sell's price correction fee to the pool - there is no quote output
        pool.quoteAssetReserveInPips += poolTrade
          .takerPriceCorrectionFeeQuantityInPips;
      } else {
        pool.quoteAssetReserveInPips -= poolTrade.getPoolDebitQuantityInPips(
          orderSide
        );
      }

      updatedProduct =
        uint128(
          pool.baseAssetReserveInPips - poolTrade.takerPoolFeeQuantityInPips
        ) *
        uint128(pool.quoteAssetReserveInPips);
    }

    // Constant product will increase when there are fees collected
    require(
      updatedProduct >= initialProduct,
      'Constant product cannot decrease'
    );

    // Disallow either ratio to dip below the minimum as prices can no longer be represented with
    // full pip precision
    require(
      pool.baseAssetReserveInPips >= Constants.minLiquidityPoolReserveInPips,
      'Base reserves below min'
    );
    require(
      pool.quoteAssetReserveInPips >= Constants.minLiquidityPoolReserveInPips,
      'Quote reserves below min'
    );
    Validations.validatePoolReserveRatio(pool);

    return (pool.baseAssetReserveInPips, pool.quoteAssetReserveInPips);
  }

  // Helpers //

  function loadLiquidityPoolByAssetAddresses(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress
  ) internal view returns (LiquidityPool storage pool) {
    pool = self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
    require(pool.exists, 'No pool for address pair');
  }

  function loadLiquidityProviderTokenByAssetAddresses(
    Storage storage self,
    address assetA,
    address assetB
  ) private view returns (ILiquidityProviderToken liquidityProviderToken) {
    liquidityProviderToken = self.liquidityProviderTokensByAddress[assetA][
      assetB
    ];
    require(
      address(liquidityProviderToken) != address(0x0),
      'No LP token for address pair'
    );
  }

  function validateAndUpdateReservesForLiquidityAddition(
    LiquidityPool storage pool,
    LiquidityChangeExecution memory execution
  ) private {
    uint64 initialPrice = pool.calculateCurrentPoolPriceInPips();

    // Credit pool reserves
    pool.baseAssetReserveInPips += execution.netBaseQuantityInPips;
    pool.quoteAssetReserveInPips += execution.netQuoteQuantityInPips;

    // Require pool price to remain constant on addition. Skip this validation if either reserve is
    // below the minimum as prices can no longer be represented with full pip precision
    if (initialPrice == 0) {
      // First liquidity addition to empty pool establishes price which must be within max ratio
      Validations.validatePoolReserveRatio(pool);
    } else if (
      pool.baseAssetReserveInPips >= Constants.minLiquidityPoolReserveInPips &&
      pool.quoteAssetReserveInPips >= Constants.minLiquidityPoolReserveInPips
    ) {
      uint64 updatedPrice = pool.calculateCurrentPoolPriceInPips();
      require(initialPrice == updatedPrice, 'Pool price cannot change');
    }
  }
}
