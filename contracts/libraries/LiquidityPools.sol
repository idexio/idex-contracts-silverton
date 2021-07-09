// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

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
import { LiquidityProviderToken } from '../LiquidityProviderToken.sol';
import { PoolTradeHelpers } from './PoolTradeHelpers.sol';
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

library LiquidityPools {
  using AssetRegistry for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;
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

    // Credit pool reserves
    pool.baseAssetReserveInPips += execution.netBaseQuantityInPips;
    pool.quoteAssetReserveInPips += execution.netQuoteQuantityInPips;

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
    bool isWalletExited,
    ICustodian custodian,
    address feeWallet,
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

    // Debit pool reserves
    pool.baseAssetReserveInPips -= execution.grossBaseQuantityInPips;
    pool.quoteAssetReserveInPips -= execution.grossQuoteQuantityInPips;

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
    (
      outputBaseAssetQuantityInPips,
      outputQuoteAssetQuantityInPips
    ) = LiquidityChangeExecutionValidations
      .calculateOutputAssetQuantitiesInPips(pool, liquidityToBurnInPips);
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
      pool.baseAssetReserveInPips -= poolTrade.calculatePoolDebitQuantityInPips(
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
        pool.quoteAssetReserveInPips -= poolTrade
          .calculatePoolDebitQuantityInPips(orderSide);
      }

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

  function loadOrCreateLiquidityPoolByAssetAddresses(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    AssetRegistry.Storage storage assetRegistry
  ) private returns (LiquidityPool storage pool) {
    pool = self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];

    if (!pool.exists) {
      pool = createLiquidityPoolByAssetAddresses(
        self,
        baseAssetAddress,
        quoteAssetAddress,
        assetRegistry
      );
    }
  }

  function createLiquidityPoolByAssetAddresses(
    Storage storage self,
    address baseAssetAddress,
    address quoteAssetAddress,
    AssetRegistry.Storage storage assetRegistry
  ) private returns (LiquidityPool storage pool) {
    // Use bidirectional mapping to require uniqueness of pools by asset pair regardless of
    // base-quote positions
    require(
      address(
        self.liquidityProviderTokensByAddress[baseAssetAddress][
          quoteAssetAddress
        ]
      ) == address(0x0),
      'Pool already exists'
    );

    // Create internally-tracked liquidity pool
    pool = self.poolsByAddresses[baseAssetAddress][quoteAssetAddress];
    pool.exists = true;

    // Store asset decimals to avoid redundant asset registry lookups
    Asset memory asset;
    asset = assetRegistry.loadAssetByAddress(baseAssetAddress);
    string memory baseAssetSymbol = asset.symbol;
    pool.baseAssetDecimals = asset.decimals;
    asset = assetRegistry.loadAssetByAddress(quoteAssetAddress);
    string memory quoteAssetSymbol = asset.symbol;
    pool.quoteAssetDecimals = asset.decimals;

    // Create an LP token contract tied to this market. Construct salt from byte-sorted assets to
    // maintain a stable address if asset direction is reversed via `reverseLiquidityPoolAssets`
    bytes32 salt =
      keccak256(
        baseAssetAddress < quoteAssetAddress
          ? abi.encodePacked(baseAssetAddress, quoteAssetAddress)
          : abi.encodePacked(quoteAssetAddress, baseAssetAddress)
      );
    ILiquidityProviderToken liquidityProviderToken =
      new LiquidityProviderToken{ salt: salt }(
        baseAssetAddress,
        quoteAssetAddress,
        baseAssetSymbol,
        quoteAssetSymbol
      );

    // Store LP token address in both pair directions to allow lookup by unordered asset pairs
    // during on-chain initiated liquidity removals
    self.liquidityProviderTokensByAddress[baseAssetAddress][
      quoteAssetAddress
    ] = ILiquidityProviderToken(liquidityProviderToken);
    self.liquidityProviderTokensByAddress[quoteAssetAddress][
      baseAssetAddress
    ] = ILiquidityProviderToken(liquidityProviderToken);

    // Associate the newly created LP token contract with the pool
    pool.liquidityProviderToken = ILiquidityProviderToken(
      liquidityProviderToken
    );
  }

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
}
