// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetTransfers } from './AssetTransfers.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { Constants } from './Constants.sol';
import { Depositing } from './Depositing.sol';
import { Hashing } from './Hashing.sol';
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
    mapping(address => mapping(address => ILiquidityProviderToken)) liquidityProviderTokensByAddress;
    mapping(address => mapping(address => LiquidityPool)) poolsByAddresses;
    mapping(bytes32 => LiquidityChangeState) changes;
  }

  uint64 public constant MINIMUM_LIQUIDITY = 10**3;

  // Lifecycle //

  function migrateLiquidityPool(
    Storage storage self,
    address token0,
    address token1,
    uint8 quotePosition,
    uint256 desiredLiquidity,
    address to,
    ICustodian custodian,
    IWETH9 WETH,
    AssetRegistry.Storage storage assetRegistry
  ) public returns (address liquidityProviderToken) {
    {
      // Map Pair token reserve addresses to provided market base/quote addresses
      (
        address baseAssetAddress,
        address quoteAssetAddress,
        uint256 baseAssetQuantityInAssetUnits,
        uint256 quoteAssetQuantityInAssetUnits
      ) =
        transferInFundingAssets(token0, token1, quotePosition, custodian, WETH);

      {
        // Create an LP token contract tied to this market
        bytes memory bytecode = type(LiquidityProviderToken).creationCode;
        bytes32 salt =
          keccak256(abi.encodePacked(baseAssetAddress, quoteAssetAddress));
        assembly {
          liquidityProviderToken := create2(
            0,
            add(bytecode, 32),
            mload(bytecode),
            salt
          )
        }
        ILiquidityProviderToken(liquidityProviderToken).initialize(
          baseAssetAddress,
          quoteAssetAddress
        );
      }

      {
        // Create internally tracked pool
        LiquidityPool storage pool =
          self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
        require(!pool.exists, 'Pool already exists');
        pool.exists = true;
        pool.liquidityProviderToken = ILiquidityProviderToken(
          liquidityProviderToken
        );

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

      // Store LP token address in both pair directions to allow association with unordered asset
      // pairs during on-chain initiated liquidity additions and removals
      self.liquidityProviderTokensByAddress[baseAssetAddress][
        quoteAssetAddress
      ] = ILiquidityProviderToken(liquidityProviderToken);
      self.liquidityProviderTokensByAddress[quoteAssetAddress][
        baseAssetAddress
      ] = ILiquidityProviderToken(liquidityProviderToken);

      // Mint desired liquidity to Farm to complete migration
      ILiquidityProviderToken(liquidityProviderToken).mint(
        address(this),
        desiredLiquidity,
        baseAssetQuantityInAssetUnits,
        quoteAssetQuantityInAssetUnits,
        to
      );
    }
  }

  function createLiquidityPool(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    AssetRegistry.Storage storage assetRegistry
  ) public returns (address liquidityProviderToken) {
    {
      {
        // Create an LP token contract tied to this market
        bytes memory bytecode = type(LiquidityProviderToken).creationCode;
        bytes32 salt =
          keccak256(abi.encodePacked(baseAssetAddress, quoteAssetAddress));
        assembly {
          liquidityProviderToken := create2(
            0,
            add(bytecode, 32),
            mload(bytecode),
            salt
          )
        }
        ILiquidityProviderToken(liquidityProviderToken).initialize(
          baseAssetAddress,
          quoteAssetAddress
        );
      }

      {
        // Create internally tracked pool
        LiquidityPool storage pool =
          self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
        require(!pool.exists, 'Pool already exists');
        pool.exists = true;
        pool.liquidityProviderToken = ILiquidityProviderToken(
          liquidityProviderToken
        );

        // Store asset decimals to avoid redundant asset registry lookups
        Asset memory asset;
        asset = assetRegistry.loadAssetByAddress(baseAssetAddress);
        pool.baseAssetDecimals = asset.decimals;
        asset = assetRegistry.loadAssetByAddress(quoteAssetAddress);
        pool.quoteAssetDecimals = asset.decimals;
      }

      // Store LP token address in both pair directions to allow association with unordered asset
      // pairs during on-chain initiated liquidity additions and removals
      self.liquidityProviderTokensByAddress[baseAssetAddress][
        quoteAssetAddress
      ] = ILiquidityProviderToken(liquidityProviderToken);
      self.liquidityProviderTokensByAddress[quoteAssetAddress][
        baseAssetAddress
      ] = ILiquidityProviderToken(liquidityProviderToken);
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
      ILiquidityProviderToken liquidityProviderToken,
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
      liquidityProviderToken
    );
  }

  function validateAndUpdateForLiquidityAddition(
    Storage storage self,
    LiquidityAddition memory addition,
    LiquidityChangeExecution memory execution
  )
    private
    returns (
      ILiquidityProviderToken liquidityProviderToken,
      uint8 baseAssetDecimals,
      uint8 quoteAssetDecimals
    )
  {
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

    // Mint minimum liquidity to zero address to mitigate chances of extreme pricing for a single
    // unit of liquidity
    if (liquidityProviderToken.totalSupply() == 0) {
      liquidityProviderToken.mint(
        addition.wallet,
        Constants.minimumLiquidity,
        0,
        0,
        address(0x0)
      );
    }

    // Mint LP tokens to destination wallet
    liquidityProviderToken.mint(
      addition.wallet,
      execution.liquidity,
      netBaseAssetQuantityInAssetUnits,
      netQuoteAssetQuantityInAssetUnits,
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
  ) public {
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
    ICustodian custodian,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    BalanceTracking.Storage storage balanceTracking
  ) public {
    ILiquidityProviderToken liquidityProviderToken =
      validateAndUpdateForLiquidityRemoval(self, removal, execution);

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
    LiquidityChangeExecution memory execution
  ) private returns (ILiquidityProviderToken liquidityProviderToken) {
    {
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

    LiquidityPool storage pool =
      loadLiquidityPoolByAssetAddresses(
        self,
        execution.baseAssetAddress,
        execution.quoteAssetAddress
      );
    liquidityProviderToken = pool.liquidityProviderToken;

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

    liquidityProviderToken.burn(
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
      balanceTracking.updateForExit(
        msg.sender,
        address(pool.liquidityProviderToken)
      );
    uint256 liquidityToBurnInAssetUnits =
      AssetUnitConversions.pipsToAssetUnits(
        liquidityToBurnInPips,
        Constants.liquidityProviderTokenDecimals
      );

    // Calculate output asset quantities
    (
      outputBaseAssetQuantityInAssetUnits,
      outputQuoteAssetQuantityInAssetUnits
    ) = Validations.getOutputAssetQuantitiesInAssetUnits(
      pool,
      liquidityToBurnInAssetUnits
    );

    {
      // Convert to pips
      uint64 outputBaseAssetQuantityInPips =
        AssetUnitConversions.assetUnitsToPips(
          outputBaseAssetQuantityInAssetUnits,
          pool.baseAssetDecimals
        );
      uint64 outputQuoteAssetQuantityInPips =
        AssetUnitConversions.assetUnitsToPips(
          outputQuoteAssetQuantityInAssetUnits,
          pool.quoteAssetDecimals
        );
      // Remove entire amounts from pool (no fees)
      pool.baseAssetReserveInPips -= outputBaseAssetQuantityInPips;
      pool.quoteAssetReserveInPips -= outputQuoteAssetQuantityInPips;
    }

    // Burn deposited Pair tokens
    pool.liquidityProviderToken.burn(
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
          pool.quoteAssetReserveInPips - poolTrade.takerPoolFeeQuantityInPips
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
  ) internal view returns (ILiquidityProviderToken liquidityProviderToken) {
    liquidityProviderToken = self.liquidityProviderTokensByAddress[assetA][
      assetB
    ];
    require(
      address(liquidityProviderToken) != address(0x0),
      'No LP token for address pair'
    );
  }

  function transferTokenReserveToCustodian(
    address token,
    uint256 reserve,
    ICustodian custodian,
    IWETH9 WETH
  ) private {
    // Unwrap WETH
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

  function transferInFundingAssets(
    address token0,
    address token1,
    uint8 quotePosition,
    ICustodian custodian,
    IWETH9 WETH
  )
    private
    returns (
      address baseAssetAddress,
      address quoteAssetAddress,
      uint256 baseAssetQuantityInAssetUnits,
      uint256 quoteAssetQuantityInAssetUnits
    )
  {
    // Obtain reserve amounts sent to the Exchange
    uint256 reserve0 = IERC20(token0).balanceOf(address(this));
    uint256 reserve1 = IERC20(token1).balanceOf(address(this));
    // Transfer reserves to Custodian and unwrap WETH if needed
    transferTokenReserveToCustodian(token0, reserve0, custodian, WETH);
    transferTokenReserveToCustodian(token1, reserve1, custodian, WETH);

    address unwrappedToken0 = token0 == address(WETH) ? address(0x0) : token0;
    address unwrappedToken1 = token1 == address(WETH) ? address(0x0) : token1;

    return
      quotePosition == 0
        ? (unwrappedToken1, unwrappedToken0, reserve1, reserve0)
        : (unwrappedToken0, unwrappedToken1, reserve0, reserve1);
  }
}
