// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.4;

import { Address } from '@openzeppelin/contracts/utils/Address.sol';

import { AssetRegistry } from './libraries/AssetRegistry.sol';
import { AssetUnitConversions } from './libraries/AssetUnitConversions.sol';
import { BalanceTracking } from './libraries/BalanceTracking.sol';
import { Constants } from './libraries/Constants.sol';
import { Depositing } from './libraries/Depositing.sol';
import { LiquidityPools } from './libraries/LiquidityPools.sol';
import { LiquidityPoolAdmin } from './libraries/LiquidityPoolAdmin.sol';
import { NonceInvalidations } from './libraries/NonceInvalidations.sol';
import { Owned } from './Owned.sol';
import { Trading } from './libraries/Trading.sol';
import { UUID } from './libraries/UUID.sol';
import { Withdrawing } from './libraries/Withdrawing.sol';
import { LiquidityChangeOrigination, OrderSide } from './libraries/Enums.sol';
import {
  ICustodian,
  IERC20,
  IExchange,
  ILiquidityProviderToken,
  IWETH9
} from './libraries/Interfaces.sol';
import {
  Asset,
  HybridTrade,
  LiquidityAddition,
  LiquidityAdditionDepositResult,
  LiquidityChangeExecution,
  LiquidityMigration,
  LiquidityPool,
  LiquidityRemoval,
  LiquidityRemovalDepositResult,
  NonceInvalidation,
  Order,
  OrderBookTrade,
  PoolTrade,
  Withdrawal
} from './libraries/Structs.sol';

/**
 * @notice The Exchange contract. Implements all deposit, trade, and withdrawal logic and
 * associated balance tracking
 *
 * @dev The term `asset` refers collectively to ETH and ERC-20 tokens, the term `token` refers only
 * to the latter
 */
contract Exchange is IExchange, Owned {
  using AssetRegistry for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;
  using LiquidityPools for LiquidityPools.Storage;
  using LiquidityPoolAdmin for LiquidityPools.Storage;
  using NonceInvalidations for mapping(address => NonceInvalidation);

  // Events //

  /**
   * @notice Emitted when an admin changes the Chain Propagation Period tunable parameter with
   * `setChainPropagationPeriod`
   */
  event ChainPropagationPeriodChanged(uint256 previousValue, uint256 newValue);
  /**
   * @notice Emitted when a user deposits ETH with `depositEther` or a token with
   * `depositTokenByAddress` or `depositTokenBySymbol`
   */
  event Deposited(
    uint64 index,
    address wallet,
    address assetAddress,
    string assetSymbol,
    uint64 quantityInPips,
    uint64 newExchangeBalanceInPips,
    uint256 newExchangeBalanceInAssetUnits
  );
  /**
   * @notice Emitted when the Dispatcher Wallet submits a hybrid trade for execution with
   * `executeHybridTrade`
   */
  event HybridTradeExecuted(
    address buyWallet,
    address sellWallet,
    string baseAssetSymbol,
    string quoteAssetSymbol,
    uint64 orderBookBaseQuantityInPips,
    uint64 orderBookQuoteQuantityInPips,
    uint64 poolBaseQuantityInPips,
    uint64 poolQuoteQuantityInPips,
    uint64 totalBaseQuantityInPips,
    uint64 totalQuoteQuantityInPips,
    OrderSide takerSide
  );
  /**
   * @notice Emitted when a user initiates an Add Liquidity request via `addLiquidity` or
   * `addLiquidityETH`
   */
  event LiquidityAdditionInitiated(
    address wallet,
    address assetA,
    address assetB,
    uint256 amountADesired,
    uint256 amountBDesired,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
  );
  /**
   * @notice Emitted when the Dispatcher Wallet submits a liquidity addition for execution with
   * `executeAddLiquidity`
   */
  event LiquidityAdditionExecuted(
    address wallet,
    address baseAssetAddress,
    address quoteAssetAddress,
    uint64 baseQuantityInPips,
    uint64 quoteQuantityInPips,
    uint64 liquidityInPips
  );
  /**
   * @notice Emitted when a
   */
  event LiquidityPoolCreated(
    address baseAssetAddress,
    address quoteAssetAddress,
    address liquidityProviderToken
  );
  /**
   * @notice Emitted when an Admin switches liquidity pool asset direction via
   * `reverseLiquidityPoolAssets`
   */
  event LiquidityPoolAssetsReversed(
    address originalBaseAssetAddress,
    address originalQuoteAssetAddress
  );
  /**
   * @notice Emitted when a user initiates a Remove Liquidity request via `removeLiquidity` or
   * `removeLiquidityETH`
   */
  event LiquidityRemovalInitiated(
    address wallet,
    address assetA,
    address assetB,
    uint256 liquidity,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
  );
  /**
   * @notice Emitted when the Dispatcher Wallet submits a liquidity removal for execution with
   * `executeRemoveLiquidity`
   */
  event LiquidityRemovalExecuted(
    address wallet,
    address baseAssetAddress,
    address quoteAssetAddress,
    uint64 baseQuantityInPips,
    uint64 quoteQuantityInPips,
    uint64 liquidityInPips
  );
  /**
   * @notice Emitted when the Dispatcher Wallet submits a trade for execution with
   * `executeOrderBookTrade`
   */
  event OrderBookTradeExecuted(
    address buyWallet,
    address sellWallet,
    string baseAssetSymbol,
    string quoteAssetSymbol,
    uint64 baseQuantityInPips,
    uint64 quoteQuantityInPips,
    OrderSide takerSide
  );
  /**
   * @notice Emitted when a user invalidates an order nonce with `invalidateOrderNonce`
   */
  event OrderNonceInvalidated(
    address wallet,
    uint128 nonce,
    uint128 timestampInMs,
    uint256 effectiveBlockNumber
  );
  /**
   * @notice Emitted when the Dispatcher Wallet submits a pool trade for execution with
   * `executePoolTrade`
   */
  event PoolTradeExecuted(
    address wallet,
    string baseAssetSymbol,
    string quoteAssetSymbol,
    uint64 baseQuantityInPips,
    uint64 quoteQuantityInPips,
    OrderSide takerSide
  );
  /**
   * @notice Emitted when an admin adds a symbol to a previously registered and confirmed token
   * via `addTokenSymbol`
   */
  event TokenSymbolAdded(IERC20 assetAddress, string assetSymbol);
  /**
   * @notice Emitted when the Dispatcher Wallet submits a trade for execution with `executeOrderBookTrade`
   * @notice Emitted when the Dispatcher Wallet submits a trade for execution with
   * `executeOrderBookTrade`
   */
  /**
   * @notice Emitted when a user invokes the Exit Wallet mechanism with `exitWallet`
   */
  event WalletExited(address wallet, uint256 effectiveBlockNumber);
  /**
   * @notice Emitted when a user withdraws liquidity reserve assets through the Exit Wallet
   * mechanism with `removeLiquidityExit`
   */
  event WalletExitLiquidityRemoved(
    address wallet,
    address baseAssetAddress,
    address quoteAssetAddress,
    uint64 baseAssetQuantityInPips,
    uint64 quoteAssetQuantityInPips
  );
  /**
   * @notice Emitted when a user withdraws an asset balance through the Exit Wallet mechanism with
   * `withdrawExit`
   */
  event WalletExitWithdrawn(
    address wallet,
    address assetAddress,
    uint64 quantityInPips
  );
  /**
   * @notice Emitted when a user clears the exited status of a wallet previously exited with
   * `exitWallet`
   */
  event WalletExitCleared(address wallet);
  /**
   * @notice Emitted when the Dispatcher Wallet submits a withdrawal with `withdraw`
   */
  event Withdrawn(
    address wallet,
    address assetAddress,
    string assetSymbol,
    uint64 quantityInPips,
    uint64 newExchangeBalanceInPips,
    uint256 newExchangeBalanceInAssetUnits
  );

  // Internally used structs //

  struct WalletExit {
    bool exists;
    uint256 effectiveBlockNumber;
  }

  // Storage //

  // Asset registry data
  AssetRegistry.Storage _assetRegistry;
  // Balance tracking
  BalanceTracking.Storage _balanceTracking;
  // CLOB - mapping of order wallet hash => isComplete
  mapping(bytes32 => bool) _completedOrderHashes;
  // CLOB - mapping of wallet => last invalidated timestampInMs
  mapping(address => NonceInvalidation) _nonceInvalidations;
  // CLOB - mapping of order hash => filled quantity in pips
  mapping(bytes32 => uint64) _partiallyFilledOrderQuantitiesInPips;
  // Custodian
  ICustodian _custodian;
  // Deposit index
  uint64 _depositIndex;
  // Exits
  mapping(address => WalletExit) _walletExits;
  // Liquidity pools
  address _liquidityMigrator;
  LiquidityPools.Storage _liquidityPools;
  // Withdrawals - mapping of withdrawal wallet hash => isComplete
  mapping(bytes32 => bool) _completedWithdrawalHashes;
  // Tunable parameters
  uint256 _chainPropagationPeriod;
  address _dispatcherWallet;
  address _feeWallet;

  /**
   * @notice Instantiate a new `Exchange` contract
   *
   * @dev Sets `_balanceMigrationSource` to first argument, and `_owner` and `_admin` to
   * `msg.sender`
   */
  constructor(
    IExchange balanceMigrationSource,
    address feeWallet,
    string memory nativeAssetSymbol
  ) Owned() {
    require(
      address(balanceMigrationSource) == address(0x0) ||
        Address.isContract(address(balanceMigrationSource)),
      'Invalid migration source'
    );
    _balanceTracking.migrationSource = balanceMigrationSource;

    setFeeWallet(feeWallet);

    _assetRegistry.nativeAssetSymbol = nativeAssetSymbol;

    // Deposits must be manually enabled via `setDepositIndex`
    _depositIndex = Constants.depositIndexNotSet;
  }

  /**
   * @notice Sets the address of the `Custodian` contract
   *
   * @dev The `Custodian` accepts `Exchange` and `Governance` addresses in its constructor, after
   * which they can only be changed by the `Governance` contract itself. Therefore the `Custodian`
   * must be deployed last and its address set here on an existing `Exchange` contract. This value
   * is immutable once set and cannot be changed again
   *
   * @param newCustodian The address of the `Custodian` contract deployed against this `Exchange`
   * contract's address
   */
  function setCustodian(ICustodian newCustodian) external onlyAdmin {
    require(
      _custodian == ICustodian(payable(address(0x0))),
      'Custodian can only be set once'
    );
    require(Address.isContract(address(newCustodian)), 'Invalid address');

    _custodian = newCustodian;
  }

  /**
   * @notice Enable depositing assets into the Exchange by setting the current deposit index from
   * the old Exchange contract's value
   *
   * @dev The Whistler Exchange does not expose its `_depositIndex` making this manual migration
   * necessary. If this Exchange is not upgraded from Whistler, call this function with
   * `newDepositIndex` set to 0. This value cannot be changed again once set
   *
   * @param newDepositIndex The value of `_depositIndex` currently set on the old Exchange contract
   */
  function setDepositIndex(uint64 newDepositIndex) external onlyAdmin {
    require(
      _depositIndex == Constants.depositIndexNotSet,
      'Can only be set once'
    );
    require(
      newDepositIndex != Constants.depositIndexNotSet,
      'Invalid deposit index'
    );

    _depositIndex = newDepositIndex;
  }

  /*** Tunable parameters ***/

  /**
   * @notice Sets a new Chain Propagation Period - the block delay after which order nonce
   * invalidations and wallet exits go into effect
   *
   * @param newChainPropagationPeriod The new Chain Propagation Period expressed as a number of
   * blocks. Must be less than `Constants.maxChainPropagationPeriod`
   */
  function setChainPropagationPeriod(uint256 newChainPropagationPeriod)
    external
    onlyAdmin
  {
    require(
      newChainPropagationPeriod < Constants.maxChainPropagationPeriod,
      'New period greater than max'
    );

    uint256 oldChainPropagationPeriod = _chainPropagationPeriod;
    _chainPropagationPeriod = newChainPropagationPeriod;

    emit ChainPropagationPeriodChanged(
      oldChainPropagationPeriod,
      newChainPropagationPeriod
    );
  }

  /**
   * @notice Sets the address of the Fee wallet
   *
   * @dev Trade and Withdraw fees will accrue in the `_balances` mappings for this wallet
   * @dev Visibility public instead of external to allow invocation from `constructor`
   *
   * @param newFeeWallet The new Fee wallet. Must be different from the current one
   */
  function setFeeWallet(address newFeeWallet) public onlyAdmin {
    require(newFeeWallet != address(0x0), 'Invalid wallet address');
    require(newFeeWallet != _feeWallet, 'Must be different from current');

    _feeWallet = newFeeWallet;
  }

  /**
   * @notice Sets the address of the `Migrator` contract
   *
   * @param newMigrator The new Migrator contract. Must be different from the current one
   */
  function setMigrator(address newMigrator) external onlyAdmin {
    require(Address.isContract(address(newMigrator)), 'Invalid address');
    require(
      newMigrator != _liquidityMigrator,
      'Must be different from current'
    );

    _liquidityMigrator = newMigrator;
  }

  // Accessors //

  /**
   * @notice Load a wallet's balance by asset address, in asset units
   *
   * @param wallet The wallet address to load the balance for. Can be different from `msg.sender`
   * @param assetAddress The asset address to load the wallet's balance for
   *
   * @return The quantity denominated in asset units of asset at `assetAddress` currently
   * deposited by `wallet`
   */
  function loadBalanceInAssetUnitsByAddress(
    address wallet,
    address assetAddress
  ) external view returns (uint256) {
    return
      _assetRegistry.loadBalanceInAssetUnitsByAddress(
        wallet,
        assetAddress,
        _balanceTracking
      );
  }

  /**
   * @notice Load a wallet's balance by asset symbol, in asset units
   *
   * @param wallet The wallet address to load the balance for. Can be different from `msg.sender`
   * @param assetSymbol The asset symbol to load the wallet's balance for
   *
   * @return The quantity denominated in asset units of asset `assetSymbol` currently deposited
   * by `wallet`
   */
  function loadBalanceInAssetUnitsBySymbol(
    address wallet,
    string calldata assetSymbol
  ) external view returns (uint256) {
    return
      _assetRegistry.loadBalanceInAssetUnitsBySymbol(
        wallet,
        assetSymbol,
        _balanceTracking
      );
  }

  /**
   * @notice Load a wallet's balance by asset address, in pips
   *
   * @param wallet The wallet address to load the balance for. Can be different from `msg.sender`
   * @param assetAddress The asset address to load the wallet's balance for
   *
   * @return The quantity denominated in pips of asset at `assetAddress` currently deposited by
   * `wallet`
   */
  function loadBalanceInPipsByAddress(address wallet, address assetAddress)
    external
    view
    override
    returns (uint64)
  {
    return
      AssetRegistry.loadBalanceInPipsByAddress(
        wallet,
        assetAddress,
        _balanceTracking
      );
  }

  /**
   * @notice Load a wallet's balance by asset symbol, in pips
   *
   * @param wallet The wallet address to load the balance for. Can be different from `msg.sender`
   * @param assetSymbol The asset symbol to load the wallet's balance for
   *
   * @return The quantity denominated in pips of asset with `assetSymbol` currently deposited by
   * `wallet`
   */
  function loadBalanceInPipsBySymbol(
    address wallet,
    string calldata assetSymbol
  ) external view returns (uint64) {
    return
      _assetRegistry.loadBalanceInPipsBySymbol(
        wallet,
        assetSymbol,
        _balanceTracking
      );
  }

  /**
   * @notice Load the address of the Custodian contract
   *
   * @return The address of the Custodian contract
   */
  function loadCustodian() external view override returns (ICustodian) {
    return _custodian;
  }

  /**
   * @notice Load the address of the Fee wallet
   *
   * @return The address of the Fee wallet
   */
  function loadFeeWallet() external view returns (address) {
    return _feeWallet;
  }

  /**
   * @notice Load the internally-tracked liquidity pool descriptor for a base-quote asset pair
   *
   * @return A `LiquidityPool` struct encapsulating the current state of the internally-tracked
   * liquidity pool for the given base-quote asset pair. Reverts if no such pool exists
   */
  function loadLiquidityPoolByAssetAddresses(
    address baseAssetAddress,
    address quoteAssetAddress
  ) external view returns (LiquidityPool memory) {
    return
      _liquidityPools.loadLiquidityPoolByAssetAddresses(
        baseAssetAddress,
        quoteAssetAddress
      );
  }

  /**
   * @notice Load the address of the Migrator contract
   *
   * @return The address of the Migrator contract
   */
  function loadLiquidityMigrator() external view returns (address) {
    return _liquidityMigrator;
  }

  /**
   * @notice Load the quantity filled so far for a partially filled orders
   *
   * @dev Invalidating an order nonce will not clear partial fill quantities for earlier orders
   * because
   * the gas cost would potentially be unbound
   *
   * @param orderHash The order hash as originally signed by placing wallet that uniquely
   * identifies an order
   *
   * @return For partially filled orders, the amount filled so far in pips. For orders in all other
   * states, 0
   */
  function loadPartiallyFilledOrderQuantityInPips(bytes32 orderHash)
    external
    view
    returns (uint64)
  {
    return _partiallyFilledOrderQuantitiesInPips[orderHash];
  }

  // Depositing //

  /**
   * @notice DO NOT send assets directly to the `Exchange`, instead use the appropriate deposit
   * function
   *
   * @dev Internally used to unwrap WETH during liquidity pool migrations via
   * `migrateLiquidityPool`. The sender is only required to be a contract rather than locking it
   * to a particular WETH instance to allow for migrating from multiple pools that use different
   * WETH contracts
   */
  receive() external payable {
    require(Address.isContract(msg.sender), 'Use depositEther');
  }

  /**
   * @notice Deposit ETH
   */
  function depositEther() external payable {
    deposit(
      msg.sender,
      _assetRegistry.loadAssetByAddress(address(0x0)),
      msg.value
    );
  }

  /**
   * @notice Deposit `IERC20` compliant tokens
   *
   * @param tokenAddress The token contract address
   * @param quantityInAssetUnits The quantity to deposit. The sending wallet must first call the
   * `approve` method on the token contract for at least this quantity first
   */
  function depositTokenByAddress(
    address tokenAddress,
    uint256 quantityInAssetUnits
  ) external {
    Asset memory asset = _assetRegistry.loadAssetByAddress(tokenAddress);

    require(address(tokenAddress) != address(0x0), 'Use depositEther');

    deposit(msg.sender, asset, quantityInAssetUnits);
  }

  /**
   * @notice Deposit `IERC20` compliant tokens
   *
   * @param assetSymbol The case-sensitive symbol string for the token
   * @param quantityInAssetUnits The quantity to deposit. The sending wallet must first call the
   * `approve` method on the token contract for at least this quantity first
   */
  function depositTokenBySymbol(
    string memory assetSymbol,
    uint256 quantityInAssetUnits
  ) external {
    Asset memory asset =
      _assetRegistry.loadAssetBySymbol(
        assetSymbol,
        AssetRegistry.getCurrentTimestampInMs()
      );

    require(address(asset.assetAddress) != address(0x0), 'Use depositEther');

    deposit(msg.sender, asset, quantityInAssetUnits);
  }

  function deposit(
    address wallet,
    Asset memory asset,
    uint256 quantityInAssetUnits
  ) private {
    // Deposits are disabled until `setDepositIndex` is called successfully
    require(_depositIndex != Constants.depositIndexNotSet, 'Deposits disabled');

    // Calling exitWallet disables deposits immediately on mining, in contrast to withdrawals and
    // trades which respect the Chain Propagation Period given by `effectiveBlockNumber` via
    // `isWalletExitFinalized`
    require(!_walletExits[wallet].exists, 'Wallet exited');

    (
      uint64 quantityInPips,
      uint64 newExchangeBalanceInPips,
      uint256 newExchangeBalanceInAssetUnits
    ) =
      Depositing.deposit(
        wallet,
        asset,
        quantityInAssetUnits,
        _custodian,
        _balanceTracking
      );

    _depositIndex++;

    emit Deposited(
      _depositIndex,
      wallet,
      asset.assetAddress,
      asset.symbol,
      quantityInPips,
      newExchangeBalanceInPips,
      newExchangeBalanceInAssetUnits
    );
  }

  // Trades //

  /**
   * @notice Settles a trade between two orders submitted and matched off-chain
   *
   * @param buy An `Order` struct encoding the parameters of the buy-side order (receiving base,
   * giving quote)
   * @param sell An `Order` struct encoding the parameters of the sell-side order (giving base,
   * receiving quote)
   * @param orderBookTrade An `OrderBookTrade` struct encoding the parameters of this trade
   * execution of the two orders
   */
  function executeOrderBookTrade(
    Order memory buy,
    Order memory sell,
    OrderBookTrade memory orderBookTrade
  ) external onlyDispatcher {
    require(
      !isWalletExitFinalized(buy.walletAddress),
      'Buy wallet exit finalized'
    );
    require(
      !isWalletExitFinalized(sell.walletAddress),
      'Sell wallet exit finalized'
    );
    require(
      buy.walletAddress != sell.walletAddress,
      'Self-trading not allowed'
    );

    Trading.executeOrderBookTrade(
      buy,
      sell,
      orderBookTrade,
      _feeWallet,
      _assetRegistry,
      _balanceTracking,
      _completedOrderHashes,
      _nonceInvalidations,
      _partiallyFilledOrderQuantitiesInPips
    );

    emit OrderBookTradeExecuted(
      buy.walletAddress,
      sell.walletAddress,
      orderBookTrade.baseAssetSymbol,
      orderBookTrade.quoteAssetSymbol,
      orderBookTrade.grossBaseQuantityInPips,
      orderBookTrade.grossQuoteQuantityInPips,
      orderBookTrade.makerSide == OrderSide.Buy ? OrderSide.Sell : OrderSide.Buy
    );
  }

  /**
   * @notice Settles a trade between pool liquidity and an order submitted and matched off-chain
   *
   * @param order An `Order` struct encoding the parameters of the taker order
   * @param poolTrade A `PoolTrade` struct encoding the parameters of this trade execution between
   * the order and pool liquidity
   */
  function executePoolTrade(Order memory order, PoolTrade memory poolTrade)
    external
    onlyDispatcher
  {
    require(
      !isWalletExitFinalized(order.walletAddress),
      'Order wallet exit finalized'
    );

    Trading.executePoolTrade(
      order,
      poolTrade,
      _feeWallet,
      _assetRegistry,
      _liquidityPools,
      _balanceTracking,
      _completedOrderHashes,
      _nonceInvalidations,
      _partiallyFilledOrderQuantitiesInPips
    );

    emit PoolTradeExecuted(
      order.walletAddress,
      poolTrade.baseAssetSymbol,
      poolTrade.quoteAssetSymbol,
      poolTrade.grossBaseQuantityInPips,
      poolTrade.grossQuoteQuantityInPips,
      order.side
    );
  }

  /**
   * @notice Settles a trade between pool liquidity and two order submitted and matched off-chain.
   * The taker order is filled by pool liquidity up to the maker order price and the remainder of
   * the taker order quantity is then filled by the maker order
   *
   * @param buy An `Order` struct encoding the parameters of the buy-side order (receiving base,
   * giving quote)
   * @param sell An `Order` struct encoding the parameters of the sell-side order (giving base,
   * receiving quote)
   * @param hybridTrade A `HybridTrade` struct encoding the parameters of this trade execution
   * between the two orders and pool liquidity
   */
  function executeHybridTrade(
    Order memory buy,
    Order memory sell,
    HybridTrade memory hybridTrade
  ) external onlyDispatcher {
    // OrderBook trade validations
    require(
      !isWalletExitFinalized(buy.walletAddress),
      'Buy wallet exit finalized'
    );
    require(
      !isWalletExitFinalized(sell.walletAddress),
      'Sell wallet exit finalized'
    );

    Trading.executeHybridTrade(
      buy,
      sell,
      hybridTrade,
      _feeWallet,
      _assetRegistry,
      _liquidityPools,
      _balanceTracking,
      _completedOrderHashes,
      _nonceInvalidations,
      _partiallyFilledOrderQuantitiesInPips
    );

    emit HybridTradeExecuted(
      buy.walletAddress,
      sell.walletAddress,
      hybridTrade.orderBookTrade.baseAssetSymbol,
      hybridTrade.orderBookTrade.quoteAssetSymbol,
      hybridTrade.orderBookTrade.grossBaseQuantityInPips,
      hybridTrade.orderBookTrade.grossQuoteQuantityInPips,
      hybridTrade.poolTrade.grossBaseQuantityInPips,
      hybridTrade.poolTrade.grossQuoteQuantityInPips,
      hybridTrade.orderBookTrade.grossBaseQuantityInPips +
        hybridTrade.poolTrade.grossBaseQuantityInPips,
      hybridTrade.orderBookTrade.grossQuoteQuantityInPips +
        hybridTrade.poolTrade.grossQuoteQuantityInPips,
      hybridTrade.orderBookTrade.makerSide == OrderSide.Buy
        ? OrderSide.Sell
        : OrderSide.Buy
    );
  }

  // Withdrawing //

  /**
   * @notice Settles a user withdrawal submitted off-chain. Calls restricted to currently
   * whitelisted Dispatcher wallet
   *
   * @param withdrawal A `Withdrawal` struct encoding the parameters of the withdrawal
   */
  function withdraw(Withdrawal memory withdrawal) public onlyDispatcher {
    require(!isWalletExitFinalized(withdrawal.walletAddress), 'Wallet exited');

    (
      uint64 newExchangeBalanceInPips,
      uint256 newExchangeBalanceInAssetUnits,
      address assetAddress,
      string memory assetSymbol
    ) =
      Withdrawing.withdraw(
        withdrawal,
        _custodian,
        _feeWallet,
        _assetRegistry,
        _balanceTracking,
        _completedWithdrawalHashes
      );

    emit Withdrawn(
      withdrawal.walletAddress,
      assetAddress,
      assetSymbol,
      withdrawal.grossQuantityInPips,
      newExchangeBalanceInPips,
      newExchangeBalanceInAssetUnits
    );
  }

  // Liquidity pools //

  /**
   * @notice Create a new internally tracked liquidity pool and associated LP token
   *
   * @param baseAssetAddress The base asset address
   * @param quoteAssetAddress The quote asset address
   */
  function createLiquidityPool(
    address baseAssetAddress,
    address quoteAssetAddress
  ) external onlyAdmin {
    _liquidityPools.createLiquidityPool(
      baseAssetAddress,
      quoteAssetAddress,
      _assetRegistry
    );
  }

  /**
   * @notice Migrate reserve assets into an internally tracked liquidity pool and mint the
   * specified quantity of the associated LP token. If the pool and LP token do not already exist
   * then create new ones
   *
   * @dev This function should be called by a Migrator contract associated with a Farm by invoking
   * the `migrate` function on a Farm instance, passing in the `pid` of a pool holding tokens
   * compliant with the `IUniswapV2Pair` interface. The Migrator will then liquidate all tokens
   * held in the pool by calling the `burn` function on the Pair contract, transfer the output
   * reserve assets to the Exchange, and call this function. The Exchange then mints the
   * `desiredQuantity` of the new IDEX LP tokens back to the Migrator. This `desiredLiquidity`
   * should be exactly equal to the asset unit quantity of Pair tokens originally deposited in the
   * Farm pool
   *
   * @param token0 The address of `token0` in the Pair contract being migrated
   * @param token1 The address of `token1` in the Pair contract being migrated
   * @param isToken1Quote If true, maps `token0` to the base asset and `token1` to the quote asset
   * in the internally tracked pool; otherwise maps `token1` to base and `token0` to quote
   * @param desiredLiquidity The quantity of asset units of the new LP token to mint back to the
   * Migrator
   * @param to Recipient of the liquidity tokens
   *
   * @return liquidityProviderToken The address of the liquidity provider ERC-20 token representing
   * liquidity in the internally-tracked pool corresponding to the asset pair
   */

  function migrateLiquidityPool(
    address token0,
    address token1,
    bool isToken1Quote,
    uint256 desiredLiquidity,
    address to,
    address payable WETH
  ) external onlyMigrator returns (address liquidityProviderToken) {
    liquidityProviderToken = _liquidityPools.migrateLiquidityPool(
      LiquidityMigration(
        token0,
        token1,
        isToken1Quote,
        desiredLiquidity,
        to,
        IWETH9(WETH)
      ),
      _custodian,
      _assetRegistry
    );
  }

  /**
   * @notice Reverse the base and quote assets in an internally tracked liquidity pool
   *
   * @param baseAssetAddress The base asset address
   * @param quoteAssetAddress The quote asset address
   */
  function reverseLiquidityPoolAssets(
    address baseAssetAddress,
    address quoteAssetAddress
  ) external onlyAdmin {
    _liquidityPools.reverseLiquidityPoolAssets(
      baseAssetAddress,
      quoteAssetAddress
    );

    emit LiquidityPoolAssetsReversed(baseAssetAddress, quoteAssetAddress);
  }

  /**
   * @notice Adds liquidity to a ERC-20⇄ERC-20 pool
   *
   * @dev To cover all possible scenarios, `msg.sender` should have already given the Exchange an
   * allowance of at least `amountADesired`/`amountBDesired` on `tokenA`/`tokenB`
   *
   * @param tokenA The contract address of the desired token
   * @param tokenB The contract address of the desired token
   * @param amountADesired The amount of `tokenA` to add as liquidity if the B/A price is <=
   * `amountBDesired`/`amountADesired` (A depreciates)
   * @param amountBDesired The amount of `tokenB` to add as liquidity if the A/B price is <=
   * `amountADesired`/`amountBDesired` (B depreciates)
   * @param amountAMin Bounds the extent to which the B/A price can go up. Must be <=
   * `amountADesired`
   * @param amountBMin Bounds the extent to which the A/B price can go up. Must be <=
   * `amountBDesired`
   * @param to Recipient of the liquidity tokens
   * @param deadline Unix timestamp in seconds after which the transaction will revert
   */
  function addLiquidity(
    address tokenA,
    address tokenB,
    uint256 amountADesired,
    uint256 amountBDesired,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
  ) external {
    // Calling exitWallet disables on-chain add liquidity initiation immediately on mining, in
    // contrast to withdrawals, trades, and liquidity change executions which respect the Chain
    // Propagation Period given by `effectiveBlockNumber` via `isWalletExitFinalized`
    require(!_walletExits[msg.sender].exists, 'Wallet exited');

    LiquidityAdditionDepositResult memory result =
      _liquidityPools.addLiquidity(
        LiquidityAddition(
          Constants.signatureHashVersion,
          LiquidityChangeOrigination.OnChain,
          0,
          msg.sender,
          tokenA,
          tokenB,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          to,
          deadline,
          bytes('')
        ),
        _custodian,
        _assetRegistry,
        _balanceTracking
      );

    emit Deposited(
      ++_depositIndex,
      msg.sender,
      tokenA,
      result.assetASymbol,
      result.assetAQuantityInPips,
      result.assetANewExchangeBalanceInPips,
      result.assetANewExchangeBalanceInAssetUnits
    );

    emit Deposited(
      ++_depositIndex,
      msg.sender,
      tokenB,
      result.assetBSymbol,
      result.assetBQuantityInPips,
      result.assetBNewExchangeBalanceInPips,
      result.assetBNewExchangeBalanceInAssetUnits
    );

    emit LiquidityAdditionInitiated(
      msg.sender,
      tokenA,
      tokenB,
      amountADesired,
      amountBDesired,
      amountAMin,
      amountBMin,
      to,
      deadline
    );
  }

  /**
   * @notice Adds liquidity to a ERC-20⇄ETH pool
   *
   * @dev To cover all possible scenarios, `msg.sender` should have already given the router an
   * allowance of at least `amountTokenDesired` on `token`. `msg.value` is treated as
   * `amountETHDesired`
   *
   * @param token The contract address of the desired token
   * @param amountTokenDesired The amount of token to add as liquidity if the ETH/token
   * price is <= `msg.value`/`amountTokenDesired` (token depreciates)
   * @param amountTokenMin The amount of ETH to add as liquidity if the token/ETH
   * price is <= `amountTokenDesired`/`msg.value` (ETH depreciates)
   * @param amountETHMin Bounds the extent to which the token/ETH price can go up. Must be
   * <= `msg.value`
   * @param to Recipient of the liquidity tokens
   * @param deadline Unix timestamp in seconds after which the transaction will revert
   */
  function addLiquidityETH(
    address token,
    uint256 amountTokenDesired,
    uint256 amountTokenMin,
    uint256 amountETHMin,
    address to,
    uint256 deadline
  ) external payable {
    // Calling exitWallet disables on-chain add liquidity initiation immediately on mining, in
    // contrast to withdrawals, trades, and liquidity change executions which respect the Chain
    // Propagation Period given by `effectiveBlockNumber` via `isWalletExitFinalized`
    require(!_walletExits[msg.sender].exists, 'Wallet exited');

    LiquidityAdditionDepositResult memory result =
      _liquidityPools.addLiquidity(
        LiquidityAddition(
          Constants.signatureHashVersion,
          LiquidityChangeOrigination.OnChain,
          0,
          msg.sender,
          token,
          address(0x0),
          amountTokenDesired,
          msg.value,
          amountTokenMin,
          amountETHMin,
          to,
          deadline,
          bytes('')
        ),
        _custodian,
        _assetRegistry,
        _balanceTracking
      );

    emit Deposited(
      ++_depositIndex,
      msg.sender,
      token,
      result.assetASymbol,
      result.assetAQuantityInPips,
      result.assetANewExchangeBalanceInPips,
      result.assetANewExchangeBalanceInAssetUnits
    );

    emit Deposited(
      ++_depositIndex,
      msg.sender,
      address(0x0),
      result.assetBSymbol,
      result.assetBQuantityInPips,
      result.assetBNewExchangeBalanceInPips,
      result.assetBNewExchangeBalanceInAssetUnits
    );

    emit LiquidityAdditionInitiated(
      msg.sender,
      token,
      address(0x0),
      amountTokenDesired,
      msg.value,
      amountTokenMin,
      amountETHMin,
      to,
      deadline
    );
  }

  /**
   * @notice Settles a liquidity addition by transferring deposited assets from wallet balances to
   * pool reserves and minting LP tokens
   *
   * @param addition A `LiquidityAddition` struct encoding the parameters of the addition requested
   * by the user either on-chain via `addLiquidity` or `addLiquidityETH` or off-chain via
   * ECDSA-signed API request
   * @param execution A `LiquidityChangeExecution` struct encoding the parameters of this liquidity
   * addition execution that meets the terms of the request
   */
  function executeAddLiquidity(
    LiquidityAddition calldata addition,
    LiquidityChangeExecution calldata execution
  ) external onlyDispatcher {
    require(!isWalletExitFinalized(addition.wallet), 'Wallet exit finalized');

    _liquidityPools.executeAddLiquidity(
      addition,
      execution,
      _feeWallet,
      address(_custodian),
      _balanceTracking
    );

    emit LiquidityAdditionExecuted(
      addition.wallet,
      execution.baseAssetAddress,
      execution.quoteAssetAddress,
      execution.grossBaseQuantityInPips,
      execution.grossQuoteQuantityInPips,
      execution.liquidityInPips
    );
  }

  /**
   * @notice Removes liquidity from an ERC-20⇄ERC-20 pool
   *
   * @dev `msg.sender` should have already given the Exchange an allowance of at least `liquidity`
   * on the pool
   *
   * @param tokenA The contract address of the desired token
   * @param tokenB The contract address of the desired token
   * @param liquidity The amount of liquidity tokens to remove
   * @param amountAMin The minimum amount of `tokenA` that must be received
   * @param amountBMin The minimum amount of `tokenB` that must be received
   * @param to Recipient of the underlying assets
   * @param deadline Unix timestamp in seconds after which the transaction will revert
   */
  function removeLiquidity(
    address tokenA,
    address tokenB,
    uint256 liquidity,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
  ) public {
    // Calling exitWallet disables on-chain remove liquidity initiation immediately on mining, in
    // contrast to withdrawals, trades, and liquidity change executions which respect the Chain
    // Propagation Period given by `effectiveBlockNumber` via `isWalletExitFinalized`
    require(!_walletExits[msg.sender].exists, 'Wallet exited');

    LiquidityRemovalDepositResult memory result =
      _liquidityPools.removeLiquidity(
        LiquidityRemoval(
          Constants.signatureHashVersion,
          LiquidityChangeOrigination.OnChain,
          0,
          msg.sender,
          tokenA,
          tokenB,
          liquidity,
          amountAMin,
          amountBMin,
          payable(to),
          deadline,
          bytes('')
        ),
        _custodian,
        _assetRegistry,
        _balanceTracking
      );

    emit Deposited(
      ++_depositIndex,
      msg.sender,
      result.assetAddress,
      result.assetSymbol,
      result.assetQuantityInPips,
      result.assetNewExchangeBalanceInPips,
      result.assetNewExchangeBalanceInAssetUnits
    );

    emit LiquidityRemovalInitiated(
      msg.sender,
      tokenA,
      tokenB,
      liquidity,
      amountAMin,
      amountBMin,
      to,
      deadline
    );
  }

  /**
   * @notice Removes liquidity from an ERC-20⇄ETH pool and receive ETH
   *
   * @dev `msg.sender` should have already given the Exchange an allowance of at least `liquidity`
   * on the pool
   *
   * @param token token The contract address of the desired token
   * @param token liquidity The amount of liquidity tokens to remove
   * @param token amountTokenMin The minimum amount of token that must be received
   * @param token amountETHMin The minimum amount of ETH that must be received
   * @param to Recipient of the underlying assets
   * @param deadline Unix timestamp in seconds after which the transaction will revert
   */
  function removeLiquidityETH(
    address token,
    uint256 liquidity,
    uint256 amountTokenMin,
    uint256 amountETHMin,
    address to,
    uint256 deadline
  ) external {
    // Calling exitWallet disables on-chain remove liquidity initiation immediately on mining, in
    // contrast to withdrawals, trades, and liquidity change executions which respect the Chain
    // Propagation Period given by `effectiveBlockNumber` via `isWalletExitFinalized`
    require(!_walletExits[msg.sender].exists, 'Wallet exited');

    LiquidityRemovalDepositResult memory result =
      _liquidityPools.removeLiquidity(
        LiquidityRemoval(
          Constants.signatureHashVersion,
          LiquidityChangeOrigination.OnChain,
          0,
          msg.sender,
          token,
          address(0x0),
          liquidity,
          amountTokenMin,
          amountETHMin,
          payable(to),
          deadline,
          bytes('')
        ),
        _custodian,
        _assetRegistry,
        _balanceTracking
      );

    emit Deposited(
      ++_depositIndex,
      msg.sender,
      address(0x0),
      result.assetSymbol,
      result.assetQuantityInPips,
      result.assetNewExchangeBalanceInPips,
      result.assetNewExchangeBalanceInAssetUnits
    );

    emit LiquidityRemovalInitiated(
      msg.sender,
      token,
      address(0x0),
      liquidity,
      amountTokenMin,
      amountETHMin,
      payable(to),
      deadline
    );
  }

  /**
   * @notice Settles a liquidity removal by burning deposited LP tokens and transferring reserve
   * assets from pool reserves to the recipient
   *
   * @param removal A `LiquidityRemoval` struct encoding the parameters of the removal requested
   * by the user either 1) on-chain via `removeLiquidity` or `removeLiquidityETH`, 2) off-chain via
   * ECDSA-signed API request, or 3) requested by the Dispatcher wallet itself in case the wallet
   * has exited and its liquidity positions must be liquidated automatically
   * @param execution A `LiquidityChangeExecution` struct encoding the parameters of this liquidity
   * removal execution that meets the terms of the request
   */
  function executeRemoveLiquidity(
    LiquidityRemoval calldata removal,
    LiquidityChangeExecution calldata execution
  ) external onlyDispatcher {
    _liquidityPools.executeRemoveLiquidity(
      removal,
      execution,
      _walletExits[removal.wallet].exists,
      ICustodian(_custodian),
      _feeWallet,
      _balanceTracking
    );

    emit LiquidityRemovalExecuted(
      removal.wallet,
      execution.baseAssetAddress,
      execution.quoteAssetAddress,
      execution.grossBaseQuantityInPips,
      execution.grossQuoteQuantityInPips,
      execution.liquidityInPips
    );
  }

  /**
   * @notice Remove liquidity from a pool immediately without the need for Dispatcher wallet
   * settlement. The wallet must be exited and the Chain Propagation Period must have already
   * passed since calling `exitWallet`. The LP tokens must already be deposited in the Exchange
   *
   * @param baseAssetAddress The base asset address
   * @param quoteAssetAddress The quote asset address
   */
  function removeLiquidityExit(
    address baseAssetAddress,
    address quoteAssetAddress
  ) external {
    require(isWalletExitFinalized(msg.sender), 'Wallet exit not finalized');

    (
      uint64 outputBaseAssetQuantityInPips,
      uint64 outputQuoteAssetQuantityInPips
    ) =
      _liquidityPools.removeLiquidityExit(
        baseAssetAddress,
        quoteAssetAddress,
        ICustodian(_custodian),
        _balanceTracking
      );

    emit WalletExitLiquidityRemoved(
      msg.sender,
      baseAssetAddress,
      quoteAssetAddress,
      outputBaseAssetQuantityInPips,
      outputQuoteAssetQuantityInPips
    );
  }

  // Wallet exits //

  /**
   * @notice Flags the sending wallet as exited, immediately disabling deposits and on-chain
   * intitiation of liquidity changes upon mining. After the Chain Propagation Period passes
   * trades, withdrawals, and liquidity change executions are also disabled for the wallet,
   * and assets may then be withdrawn one at a time via `withdrawExit`
   */
  function exitWallet() external {
    require(!_walletExits[msg.sender].exists, 'Wallet already exited');

    _walletExits[msg.sender] = WalletExit(
      true,
      block.number + _chainPropagationPeriod
    );

    emit WalletExited(msg.sender, block.number + _chainPropagationPeriod);
  }

  /**
   * @notice Withdraw the entire balance of an asset for an exited wallet. The Chain Propagation
   * Period must have already passed since calling `exitWallet`
   *
   * @param assetAddress The address of the asset to withdraw
   */
  function withdrawExit(address assetAddress) external {
    require(isWalletExitFinalized(msg.sender), 'Wallet exit not finalized');

    // Update wallet balance
    uint64 previousExchangeBalanceInPips =
      Withdrawing.withdrawExit(
        assetAddress,
        _custodian,
        _assetRegistry,
        _balanceTracking
      );

    emit WalletExitWithdrawn(
      msg.sender,
      assetAddress,
      previousExchangeBalanceInPips
    );
  }

  /**
   * @notice Clears exited status of sending wallet. Upon mining immediately enables
   * deposits, trades, and withdrawals by sending wallet
   */
  function clearWalletExit() external {
    require(isWalletExitFinalized(msg.sender), 'Wallet exit not finalized');

    delete _walletExits[msg.sender];

    emit WalletExitCleared(msg.sender);
  }

  function isWalletExitFinalized(address wallet) internal view returns (bool) {
    WalletExit storage exit = _walletExits[wallet];
    return exit.exists && exit.effectiveBlockNumber <= block.number;
  }

  // Invalidation //

  /**
   * @notice Invalidate all order nonces with a timestampInMs lower than the one provided
   *
   * @param nonce A Version 1 UUID. After calling and once the Chain Propagation Period has
   * elapsed, `executeOrderBookTrade` will reject order nonces from this wallet with a
   * timestampInMs component lower than the one provided
   */
  function invalidateOrderNonce(uint128 nonce) external {
    (uint64 timestampInMs, uint256 effectiveBlockNumber) =
      _nonceInvalidations.invalidateOrderNonce(nonce, _chainPropagationPeriod);

    emit OrderNonceInvalidated(
      msg.sender,
      nonce,
      timestampInMs,
      effectiveBlockNumber
    );
  }

  // Asset registry //

  /**
   * @notice Initiate registration process for a token asset. Only `IERC20` compliant tokens can be
   * added - ETH is hardcoded in the registry
   *
   * @param tokenAddress The address of the `IERC20` compliant token contract to add
   * @param symbol The symbol identifying the token asset
   * @param decimals The decimal precision of the token
   */
  function registerToken(
    IERC20 tokenAddress,
    string calldata symbol,
    uint8 decimals
  ) external onlyAdmin {
    _assetRegistry.registerToken(tokenAddress, symbol, decimals);
  }

  /**
   * @notice Finalize registration process for a token asset. All parameters must exactly match a
   * previous call to `registerToken`
   *
   * @param tokenAddress The address of the `IERC20` compliant token contract to add
   * @param symbol The symbol identifying the token asset
   * @param decimals The decimal precision of the token
   */
  function confirmTokenRegistration(
    IERC20 tokenAddress,
    string calldata symbol,
    uint8 decimals
  ) external onlyAdmin {
    _assetRegistry.confirmTokenRegistration(tokenAddress, symbol, decimals);
  }

  /**
   * @notice Add a symbol to a token that has already been registered and confirmed
   *
   * @param tokenAddress The address of the `IERC20` compliant token contract the symbol will
   * identify
   * @param symbol The symbol identifying the token asset
   */
  function addTokenSymbol(IERC20 tokenAddress, string calldata symbol)
    external
    onlyAdmin
  {
    _assetRegistry.addTokenSymbol(tokenAddress, symbol);
    emit TokenSymbolAdded(tokenAddress, symbol);
  }

  /**
   * @notice Loads an asset descriptor struct by its symbol and timestamp
   *
   * @dev Since multiple token addresses can potentially share the same symbol (in case of a token
   * swap/contract upgrade) the provided `timestampInMs` is compared against each asset's
   * `confirmedTimestampInMs` to uniquely determine the newest asset for the symbol at that point
   * in time
   *
   * @param assetSymbol The asset's symbol
   * @param timestampInMs Point in time used to disambiguate multiple tokens with same symbol
   *
   * @return A `Asset` record describing the asset
   */
  function loadAssetBySymbol(string calldata assetSymbol, uint64 timestampInMs)
    external
    view
    returns (Asset memory)
  {
    return _assetRegistry.loadAssetBySymbol(assetSymbol, timestampInMs);
  }

  // Dispatcher whitelisting //

  /**
   * @notice Sets the wallet whitelisted to dispatch transactions calling the
   * `executeOrderBookTrade`, `executePoolTrade`, `executeHybridTrade`, `withdraw`,
   * `executeAddLiquidity`, and `executeRemoveLiquidity` functions
   *
   * @param newDispatcherWallet The new whitelisted dispatcher wallet. Must be different from the
   * current one
   */
  function setDispatcher(address newDispatcherWallet) external onlyAdmin {
    require(newDispatcherWallet != address(0x0), 'Invalid wallet address');
    require(
      newDispatcherWallet != _dispatcherWallet,
      'Must be different from current'
    );
    _dispatcherWallet = newDispatcherWallet;
  }

  /**
   * @notice Clears the currently set whitelisted dispatcher wallet, effectively disabling calling
   * the `executeOrderBookTrade`, `executePoolTrade`, `executeHybridTrade`, `withdraw`,
   * `executeAddLiquidity`, and `executeRemoveLiquidity` functions until a new wallet is set with
   * `setDispatcher`
   */
  function removeDispatcher() external onlyAdmin {
    _dispatcherWallet = address(0x0);
  }

  modifier onlyDispatcher() {
    require(msg.sender == _dispatcherWallet, 'Caller is not dispatcher');
    _;
  }

  // Migrator whitelisting //

  modifier onlyMigrator() {
    require(msg.sender == _liquidityMigrator, 'Caller is not Migrator');
    _;
  }

  // Asset skimming //

  /**
   * @notice Sends tokens mistakenly sent directly to the `Exchange` to the fee wallet (the
   * `receive` function rejects ETH except when wrapping/unwrapping)
   */
  function skim(address tokenAddress) external onlyAdmin {
    AssetRegistry.skim(tokenAddress, _feeWallet);
  }

  // Exchange upgrades //

  /**
   * @notice Following an Exchange upgrade via the Governance contract, this function allows the
   * new Exchange to reclaim blockchain storage by cleanup up old balance tracking
   */
  function cleanupWalletBalance(address wallet, address assetAddress) external {
    address currentExchange = ICustodian(_custodian).loadExchange();
    require(msg.sender == currentExchange, 'Caller is not Exchange');

    delete _balanceTracking.balancesByWalletAssetPair[wallet][assetAddress];
  }
}
