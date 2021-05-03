// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { Address } from '@openzeppelin/contracts/utils/Address.sol';
import { ECDSA } from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import {
  IFactory
} from '@idexio/pancake-swap-core/contracts/interfaces/IFactory.sol';
import {
  IPair
} from '@idexio/pancake-swap-core/contracts/interfaces/IPair.sol';

import { AssetRegistry } from './libraries/AssetRegistry.sol';
import { AssetRegistryAdmin } from './libraries/AssetRegistryAdmin.sol';
import { AssetUnitConversions } from './libraries/AssetUnitConversions.sol';
import { BalanceTracking } from './libraries/BalanceTracking.sol';
import { Depositing } from './libraries/Depositing.sol';
import { LiquidityPoolRegistry } from './libraries/LiquidityPoolRegistry.sol';
import { Owned } from './Owned.sol';
import { Trading } from './libraries/Trading.sol';
import { Withdrawing } from './libraries/Withdrawing.sol';
import { UUID } from './libraries/UUID.sol';
import {
  Constants,
  Enums,
  ICustodian,
  IERC20,
  IExchange,
  IWETH9,
  Structs
} from './libraries/Interfaces.sol';

/**
 * @notice The Exchange contract. Implements all deposit, trade, and withdrawal logic and associated balance tracking
 *
 * @dev The term `asset` refers collectively to BNB and ERC-20 tokens, the term `token` refers only to the latter
 */
contract Exchange is IExchange, Owned {
  using AssetRegistry for AssetRegistry.Storage;
  using AssetRegistryAdmin for AssetRegistry.Storage;
  using BalanceTracking for BalanceTracking.Storage;
  using LiquidityPoolRegistry for LiquidityPoolRegistry.Storage;

  // Events //

  /**
   * @notice Emitted when an admin changes the Chain Propagation Period tunable parameter with `setChainPropagationPeriod`
   */
  event ChainPropagationPeriodChanged(uint256 previousValue, uint256 newValue);
  /**
   * @notice Emitted when a user deposits BNB with `depositEther` or a token with `depositTokenByAddress` or `depositAssetBySymbol`
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
   * @notice Emitted when an admin changes the Dispatch Wallet tunable parameter with `setDispatcher`
   */
  event DispatcherChanged(address previousValue, address newValue);
  /**
   * @notice Emitted when an admin changes the Fee Wallet tunable parameter with `setFeeWallet`
   */
  event FeeWalletChanged(address previousValue, address newValue);
  /**
   * @notice Emitted when the Dispatcher Wallet submits a hybrid trade for execution with `executeHybridTrade`
   */
  event HybridTradeExecuted(
    address buyWallet,
    address sellWallet,
    string baseAssetSymbol,
    string quoteAssetSymbol,
    uint64 poolBaseQuantityInPips,
    uint64 poolQuoteQuantityInPips,
    uint64 baseQuantityInPips,
    uint64 quoteQuantityInPips
  );
  /**
   * @notice TODO
   */
  event LiquidityAdded(
    address wallet,
    address assetA,
    address assetB,
    uint256 amountADesired,
    uint256 amountBDesired,
    uint256 amountAMin,
    uint256 amountBMin,
    address to
  );
  /**
   * @notice TODO
   */
  event LiquidityRemoved(
    address wallet,
    address assetA,
    address assetB,
    uint256 liquidity,
    uint256 amountAMin,
    uint256 amountBMin,
    address to
  );
  /**
   * @notice Emitted when a user invalidates an order nonce with `invalidateOrderNonce`
   */
  event OrderNonceInvalidated(
    address indexed wallet,
    uint128 nonce,
    uint128 timestampInMs,
    uint256 effectiveBlockNumber
  );
  /**
   * @notice Emitted when the Dispatcher Wallet submits a pool trade for execution with `executePoolTrade`
   */
  event PoolTradeExecuted(
    address buyWallet,
    address sellWallet,
    string baseAssetSymbol,
    string quoteAssetSymbol,
    uint64 poolBaseQuantityInPips,
    uint64 poolQuoteQuantityInPips,
    uint64 baseQuantityInPips,
    uint64 quoteQuantityInPips
  );
  /**
   * @notice Emitted when an admin initiates the token registration process with `registerToken`
   */
  event TokenRegistered(
    IERC20 indexed assetAddress,
    string assetSymbol,
    uint8 decimals
  );
  /**
   * @notice Emitted when an admin finalizes the token registration process with `confirmAssetRegistration`, after
   * which it can be deposited, traded, or withdrawn
   */
  event TokenRegistrationConfirmed(
    IERC20 indexed assetAddress,
    string assetSymbol,
    uint8 decimals
  );
  /**
   * @notice Emitted when an admin adds a symbol to a previously registered and confirmed token
   * via `addTokenSymbol`
   */
  event TokenSymbolAdded(IERC20 indexed assetAddress, string assetSymbol);
  /**
   * @notice Emitted when the Dispatcher Wallet submits a trade for execution with `executeTrade`
   */
  event TradeExecuted(
    address buyWallet,
    address sellWallet,
    string baseAssetSymbol,
    string quoteAssetSymbol,
    uint64 baseQuantityInPips,
    uint64 quoteQuantityInPips
  );
  /**
   * @notice Emitted when a user invokes the Exit Wallet mechanism with `exitWallet`
   */
  event WalletExited(address indexed wallet, uint256 effectiveBlockNumber);
  /**
   * @notice Emitted when a user withdraws an asset balance through the Exit Wallet mechanism with `withdrawExit`
   */
  event WalletExitWithdrawn(
    address wallet,
    address assetAddress,
    string assetSymbol,
    uint64 quantityInPips,
    uint64 newExchangeBalanceInPips,
    uint256 newExchangeBalanceInAssetUnits
  );
  /**
   * @notice Emitted when a user clears the exited status of a wallet previously exited with `exitWallet`
   */
  event WalletExitCleared(address indexed wallet);
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

  struct NonceInvalidation {
    bool exists;
    uint64 timestampInMs;
    uint256 effectiveBlockNumber;
  }
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
  address payable _custodian;
  // Deposit index
  uint64 _depositIndex;
  // Exits
  mapping(address => WalletExit) _walletExits;
  // Liquidity pools
  IFactory _pairFactoryContractAddress;
  LiquidityPoolRegistry.Storage _liquidityPoolRegistry;
  IWETH9 public immutable _WETH;
  // Withdrawals - mapping of withdrawal wallet hash => isComplete
  mapping(bytes32 => bool) _completedWithdrawalHashes;
  // Tunable parameters
  uint256 _chainPropagationPeriod;
  address _dispatcherWallet;
  address _feeWallet;

  /**
   * @notice Instantiate a new `Exchange` contract
   *
   * @dev Sets `_balanceMigrationSource` to first argument, and `_owner` and `_admin` to `msg.sender` */
  constructor(IExchange balanceMigrationSource, IWETH9 WETH) Owned() {
    require(
      Address.isContract(address(balanceMigrationSource)),
      'Invalid migration address'
    );
    _balanceTracking.migrationSource = balanceMigrationSource;

    require(Address.isContract(address(WETH)), 'Invalid WETH address');
    _WETH = WETH;
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
  function setCustodian(address payable newCustodian) external onlyAdmin {
    require(_custodian == address(0x0), 'Custodian can only be set once');
    require(Address.isContract(newCustodian), 'Invalid address');

    _custodian = newCustodian;
  }

  /*** Tunable parameters ***/

  /**
   * @notice Sets a new Chain Propagation Period - the block delay after which order nonce invalidations
   * are respected by `executeTrade` and wallet exits are respected by `executeTrade` and `withdraw`
   *
   * @param newChainPropagationPeriod The new Chain Propagation Period expressed as a number of blocks. Must
   * be less than `Constants.maxChainPropagationPeriod`
   */
  function setChainPropagationPeriod(uint256 newChainPropagationPeriod)
    external
    onlyAdmin
  {
    require(
      newChainPropagationPeriod < Constants.maxChainPropagationPeriod,
      'Must be less than 1 week'
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
   *
   * @param newFeeWallet The new Fee wallet. Must be different from the current one
   */
  function setFeeWallet(address newFeeWallet) external onlyAdmin {
    require(newFeeWallet != address(0x0), 'Invalid wallet address');
    require(newFeeWallet != _feeWallet, 'Must be different from current');

    address oldFeeWallet = _feeWallet;
    _feeWallet = newFeeWallet;

    emit FeeWalletChanged(oldFeeWallet, newFeeWallet);
  }

  function setPairFactoryAddress(IFactory newPairFactoryAddress)
    external
    onlyAdmin
  {
    require(
      address(_pairFactoryContractAddress) == address(0x0),
      'Factory can only be set once'
    );
    require(
      Address.isContract(address(newPairFactoryAddress)),
      'Invalid address'
    );

    _pairFactoryContractAddress = newPairFactoryAddress;
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
    require(wallet != address(0x0), 'Invalid wallet address');

    Structs.Asset memory asset =
      _assetRegistry.loadAssetByAddress(assetAddress);
    return
      AssetUnitConversions.pipsToAssetUnits(
        _balanceTracking.balancesByWalletAssetPair[wallet][assetAddress]
          .balanceInPips,
        asset.decimals
      );
  }

  /**
   * @notice Load a wallet's balance by asset address, in asset units
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
    require(wallet != address(0x0), 'Invalid wallet address');

    Structs.Asset memory asset =
      _assetRegistry.loadAssetBySymbol(assetSymbol, getCurrentTimestampInMs());
    return
      AssetUnitConversions.pipsToAssetUnits(
        _balanceTracking.balancesByWalletAssetPair[wallet][asset.assetAddress]
          .balanceInPips,
        asset.decimals
      );
  }

  /**
   * @notice Load a wallet's balance by asset address, in pips
   *
   * @param wallet The wallet address to load the balance for. Can be different from `msg.sender`
   * @param assetAddress The asset address to load the wallet's balance for
   *
   * @return The quantity denominated in pips of asset at `assetAddress` currently deposited by `wallet`
   */
  function loadBalanceInPipsByAddress(address wallet, address assetAddress)
    external
    view
    override
    returns (uint64)
  {
    require(wallet != address(0x0), 'Invalid wallet address');

    return
      _balanceTracking.balancesByWalletAssetPair[wallet][assetAddress]
        .balanceInPips;
  }

  /**
   * @notice Load a wallet's balance by asset symbol, in pips
   *
   * @param wallet The wallet address to load the balance for. Can be different from `msg.sender`
   * @param assetSymbol The asset symbol to load the wallet's balance for
   *
   * @return The quantity denominated in pips of asset with `assetSymbol` currently deposited by `wallet`
   */
  function loadBalanceInPipsBySymbol(
    address wallet,
    string calldata assetSymbol
  ) external view returns (uint64) {
    require(wallet != address(0x0), 'Invalid wallet address');

    address assetAddress =
      _assetRegistry
        .loadAssetBySymbol(assetSymbol, getCurrentTimestampInMs())
        .assetAddress;
    return
      _balanceTracking.balancesByWalletAssetPair[wallet][assetAddress]
        .balanceInPips;
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
   * @notice Load the quantity filled so far for a partially filled orders

   * @dev Invalidating an order nonce will not clear partial fill quantities for earlier orders because
   * the gas cost would potentially be unbound
   *
   * @param orderHash The order hash as originally signed by placing wallet that uniquely identifies an order
   *
   * @return For partially filled orders, the amount filled so far in pips. For orders in all other states, 0
   */
  function loadPartiallyFilledOrderQuantityInPips(bytes32 orderHash)
    external
    view
    returns (uint64)
  {
    return _partiallyFilledOrderQuantitiesInPips[orderHash];
  }

  // Depositing //

  receive() external payable {
    require(msg.sender == address(_WETH), 'Use depositEther');
  }

  /**
   * @notice Deposit BNB
   */
  function depositEther() external payable {
    deposit(
      address(msg.sender),
      _assetRegistry.loadAssetByAddress(address(0x0)),
      msg.value
    );
  }

  /**
   * @notice Deposit `IERC20` compliant tokens
   *
   * @param tokenAddress The token contract address
   * @param quantityInAssetUnits The quantity to deposit. The sending wallet must first call the `approve` method on
   * the token contract for at least this quantity first
   */
  function depositTokenByAddress(
    address tokenAddress,
    uint256 quantityInAssetUnits
  ) external {
    Structs.Asset memory asset =
      _assetRegistry.loadAssetByAddress(tokenAddress);

    require(address(tokenAddress) != address(0x0), 'Use depositEther');

    deposit(address(msg.sender), asset, quantityInAssetUnits);
  }

  /**
   * @notice Deposit `IERC20` compliant tokens
   *
   * @param assetSymbol The case-sensitive symbol string for the token
   * @param quantityInAssetUnits The quantity to deposit. The sending wallet must first call the `approve` method on
   * the token contract for at least this quantity first
   */
  function depositTokenBySymbol(
    string memory assetSymbol,
    uint256 quantityInAssetUnits
  ) public {
    Structs.Asset memory asset =
      _assetRegistry.loadAssetBySymbol(assetSymbol, getCurrentTimestampInMs());

    require(address(asset.assetAddress) != address(0x0), 'Use depositEther');

    deposit(msg.sender, asset, quantityInAssetUnits);
  }

  function deposit(
    address wallet,
    Structs.Asset memory asset,
    uint256 quantityInAssetUnits
  ) private {
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
   * @dev As a gas optimization, base and quote symbols are passed in separately and combined to verify
   * the wallet hash, since this is cheaper than splitting the market symbol into its two constituent asset symbols
   * @dev Stack level too deep if declared external
   *
   * @param buy A `Structs.Order` struct encoding the parameters of the buy-side order (receiving base, giving quote)
   * @param sell A `Structs.Order` struct encoding the parameters of the sell-side order (giving base, receiving quote)
   * @param trade A `Structs.Trade` struct encoding the parameters of this trade execution of the counterparty orders
   */
  function executeTrade(
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade
  ) public override onlyDispatcher {
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

    validateOrderNonces(buy, sell);

    Trading.executeCounterpartyTrade(
      buy,
      sell,
      trade,
      _feeWallet,
      _assetRegistry,
      _balanceTracking,
      _completedOrderHashes,
      _partiallyFilledOrderQuantitiesInPips
    );

    emit TradeExecuted(
      buy.walletAddress,
      sell.walletAddress,
      trade.baseAssetSymbol,
      trade.quoteAssetSymbol,
      trade.grossBaseQuantityInPips,
      trade.grossQuoteQuantityInPips
    );
  }

  function executePoolTrade(
    Structs.Order memory order,
    Structs.PoolTrade memory poolTrade
  ) public onlyDispatcher {
    require(
      !isWalletExitFinalized(order.walletAddress),
      'Order wallet exit finalized'
    );
    validateOrderNonce(order);

    Trading.executePoolTrade(
      order,
      poolTrade,
      _feeWallet,
      _assetRegistry,
      _liquidityPoolRegistry,
      _balanceTracking,
      _completedOrderHashes,
      _partiallyFilledOrderQuantitiesInPips
    );
  }

  function executeHybridTrade(
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade,
    Structs.PoolTrade memory poolTrade
  ) public onlyDispatcher {
    // Counterparty trade validations
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

    validateOrderNonces(buy, sell);

    Trading.executeHybridTrade(
      buy,
      sell,
      trade,
      poolTrade,
      _feeWallet,
      _assetRegistry,
      _liquidityPoolRegistry,
      _balanceTracking,
      _completedOrderHashes,
      _partiallyFilledOrderQuantitiesInPips
    );

    emit HybridTradeExecuted(
      buy.walletAddress,
      sell.walletAddress,
      trade.baseAssetSymbol,
      trade.quoteAssetSymbol,
      poolTrade.grossBaseQuantityInPips,
      poolTrade.grossQuoteQuantityInPips,
      trade.grossBaseQuantityInPips,
      trade.grossQuoteQuantityInPips
    );
  }

  // Withdrawing //

  /**
   * @notice Settles a user withdrawal submitted off-chain. Calls restricted to currently whitelisted Dispatcher wallet
   *
   * @param withdrawal A `Structs.Withdrawal` struct encoding the parameters of the withdrawal
   */
  function withdraw(Structs.Withdrawal memory withdrawal)
    public
    override
    onlyDispatcher
  {
    require(!isWalletExitFinalized(withdrawal.walletAddress), 'Wallet exited');

    (uint64 newExchangeBalanceInPips, uint256 newExchangeBalanceInAssetUnits) =
      Withdrawing.withdraw(
        withdrawal,
        ICustodian(_custodian),
        _feeWallet,
        _assetRegistry,
        _balanceTracking,
        _completedWithdrawalHashes
      );

    emit Withdrawn(
      withdrawal.walletAddress,
      withdrawal.assetAddress,
      withdrawal.assetSymbol,
      withdrawal.quantityInPips,
      newExchangeBalanceInPips,
      newExchangeBalanceInAssetUnits
    );
  }

  // Liquidity pools //

  function loadLiquidityPoolByAssetAddresses(
    address baseAssetAddress,
    address quoteAssetAddress
  ) public view returns (Structs.LiquidityPool memory) {
    return
      _liquidityPoolRegistry.loadLiquidityPoolByAssetAddresses(
        baseAssetAddress,
        quoteAssetAddress
      );
  }

  function promotePool(
    address baseAssetAddress,
    address quoteAssetAddress,
    IPair pairTokenAddress
  ) external onlyAdmin {
    _liquidityPoolRegistry.promotePool(
      baseAssetAddress,
      quoteAssetAddress,
      pairTokenAddress,
      _custodian,
      _pairFactoryContractAddress,
      _WETH,
      _assetRegistry
    );
  }

  /**
   * @notice Adds liquidity to a BEP-20⇄BEP-20 pool
   *
   * @dev To cover all possible scenarios, `msg.sender` should have already given the Exchange an allowance
   * of at least amountADesired/amountBDesired on tokenA/tokenB
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
    _liquidityPoolRegistry.addLiquidity(
      Structs.LiquidityAddition(
        msg.sender,
        tokenA,
        tokenB,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        to,
        deadline
      ),
      _custodian,
      _assetRegistry,
      _balanceTracking
    );

    emit LiquidityAdded(
      msg.sender,
      tokenA,
      tokenB,
      amountADesired,
      amountBDesired,
      amountAMin,
      amountBMin,
      to
    );
  }

  /**
   * @notice Adds liquidity to a BEP-20⇄BNB pool
   *
   * @dev To cover all possible scenarios, msg.sender should have already given the router an allowance
   * of at least amountTokenDesired on token. `msg.value` is treated as amountETHDesired
   */
  function addLiquidityETH(
    address token,
    uint256 amountTokenDesired,
    uint256 amountTokenMin,
    uint256 amountETHMin,
    address to,
    uint256 deadline
  ) external payable {
    _liquidityPoolRegistry.addLiquidityETH(
      Structs.LiquidityAddition(
        msg.sender,
        token,
        address(0x0),
        amountTokenDesired,
        msg.value,
        amountTokenMin,
        amountETHMin,
        to,
        deadline
      ),
      _custodian,
      _assetRegistry,
      _balanceTracking
    );

    emit LiquidityAdded(
      msg.sender,
      token,
      address(0x0),
      amountTokenDesired,
      msg.value,
      amountTokenMin,
      amountETHMin,
      to
    );
  }

  /**
   * @notice Settles a liquidity addition by adjusting pool reserves and minting LP tokens
   */
  function executeAddLiquidity(
    Structs.LiquidityAddition calldata addition,
    Structs.LiquidityChangeExecution calldata execution
  ) external onlyDispatcher {
    _liquidityPoolRegistry.executeAddLiquidity(
      addition,
      execution,
      _feeWallet,
      _balanceTracking
    );
  }

  /**
   * @notice Removes liquidity from an BEP-20⇄BEP-20 pool
   *
   * @dev `msg.sender` should have already given the Exchange an allowance of at least liquidity on the pool
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
    _liquidityPoolRegistry.removeLiquidity(
      // Use struct to avoid stack too deep
      Structs.LiquidityRemoval(
        msg.sender,
        tokenA,
        tokenB,
        liquidity,
        amountAMin,
        amountBMin,
        payable(to),
        deadline
      ),
      _custodian,
      _pairFactoryContractAddress,
      address(_WETH),
      _assetRegistry,
      _balanceTracking
    );

    emit LiquidityRemoved(
      msg.sender,
      tokenA,
      tokenB,
      liquidity,
      amountAMin,
      amountBMin,
      to
    );
  }

  /**
   * @notice Removes liquidity from an BEP-20⇄BNB pool and receive ETH
   *
   * @dev `msg.sender` should have already given the Exchange an allowance of at least liquidity on the pool
   */
  function removeLiquidityETH(
    address token,
    uint256 liquidity,
    uint256 amountTokenMin,
    uint256 amountETHMin,
    address to,
    uint256 deadline
  ) external {
    _liquidityPoolRegistry.removeLiquidity(
      // Use struct to avoid stack too deep
      Structs.LiquidityRemoval(
        msg.sender,
        token,
        address(0x0),
        liquidity,
        amountTokenMin,
        amountETHMin,
        payable(to),
        deadline
      ),
      _custodian,
      _pairFactoryContractAddress,
      address(_WETH),
      _assetRegistry,
      _balanceTracking
    );

    emit LiquidityRemoved(
      msg.sender,
      token,
      address(0x0),
      liquidity,
      amountTokenMin,
      amountETHMin,
      payable(to)
    );
  }

  /**
   * @notice Settles a liquidity removal by adjusting pool reserves, burning LP tokens, and
   * transferring output assets
   */
  function executeRemoveLiquidity(
    Structs.LiquidityRemoval calldata removal,
    Structs.LiquidityChangeExecution calldata execution
  ) external onlyDispatcher {
    _liquidityPoolRegistry.executeRemoveLiquidity(
      removal,
      execution,
      ICustodian(_custodian),
      address(this),
      _feeWallet,
      _assetRegistry,
      _balanceTracking
    );
  }

  function removeLiquidityExit(
    address baseAssetAddress,
    address quoteAssetAddress
  ) external {
    require(isWalletExitFinalized(msg.sender), 'Wallet exit not finalized');

    _liquidityPoolRegistry.removeLiquidityExit(
      baseAssetAddress,
      quoteAssetAddress,
      ICustodian(_custodian),
      _assetRegistry,
      _balanceTracking
    );
  }

  // Wallet exits //

  /**
   * @notice Flags the sending wallet as exited, immediately disabling deposits upon mining. After
   * the Chain Propagation Period passes trades and withdrawals are also disabled for the wallet,
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
   * @notice Withdraw the entire balance of an asset for an exited wallet. The Chain Propagation Period must
   * have already passed since calling `exitWallet` on `assetAddress`
   *
   * @param assetAddress The address of the asset to withdraw
   */
  function withdrawExit(address assetAddress) external {
    require(isWalletExitFinalized(msg.sender), 'Wallet exit not finalized');

    // Update wallet balance
    uint64 previousExchangeBalanceInPips =
      _balanceTracking.updateForExit(msg.sender, assetAddress);

    // Transfer asset from Custodian to wallet
    Structs.Asset memory asset =
      _assetRegistry.loadAssetByAddress(assetAddress);
    uint256 balanceInAssetUnits =
      AssetUnitConversions.pipsToAssetUnits(
        previousExchangeBalanceInPips,
        asset.decimals
      );
    ICustodian(_custodian).withdraw(
      payable(msg.sender),
      assetAddress,
      balanceInAssetUnits
    );

    emit WalletExitWithdrawn(
      msg.sender,
      assetAddress,
      asset.symbol,
      previousExchangeBalanceInPips,
      0,
      0
    );
  }

  /**
   * @notice Clears exited status of sending wallet. Upon mining immediately enables
   * deposits, trades, and withdrawals by sending wallet
   */
  function clearWalletExit() external {
    require(_walletExits[msg.sender].exists, 'Wallet not exited');

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
   * @param nonce A Version 1 UUID. After calling and once the Chain Propagation Period has elapsed,
   * `executeTrade` will reject order nonces from this wallet with a timestampInMs component lower than
   * the one provided
   */
  function invalidateOrderNonce(uint128 nonce) external {
    uint64 timestampInMs = UUID.getTimestampInMsFromUuidV1(nonce);
    // Enforce a maximum skew for invalidating nonce timestamps in the future so the user doesn't
    // lock their wallet from trades indefinitely
    require(
      timestampInMs < getOneDayFromNowInMs(),
      'Nonce timestamp too far in future'
    );

    if (_nonceInvalidations[msg.sender].exists) {
      require(
        _nonceInvalidations[msg.sender].timestampInMs < timestampInMs,
        'Nonce timestamp already invalidated'
      );
      require(
        _nonceInvalidations[msg.sender].effectiveBlockNumber <= block.number,
        'Previous invalidation awaiting chain propagation'
      );
    }

    // Changing the Chain Propagation Period will not affect the effectiveBlockNumber for this invalidation
    uint256 effectiveBlockNumber = block.number + _chainPropagationPeriod;
    _nonceInvalidations[msg.sender] = NonceInvalidation(
      true,
      timestampInMs,
      effectiveBlockNumber
    );

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
   * added - BNB is hardcoded in the registry
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
    emit TokenRegistered(tokenAddress, symbol, decimals);
  }

  /**
   * @notice Finalize registration process for a token asset. All parameters must exactly match a previous
   * call to `registerToken`
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
    emit TokenRegistrationConfirmed(tokenAddress, symbol, decimals);
  }

  /**
   * @notice Add a symbol to a token that has already been registered and confirmed
   *
   * @param tokenAddress The address of the `IERC20` compliant token contract the symbol will identify
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
   * `confirmedTimestampInMs` to uniquely determine the newest asset for the symbol at that point in time
   *
   * @param assetSymbol The asset's symbol
   * @param timestampInMs Point in time used to disambiguate multiple tokens with same symbol
   *
   * @return A `Structs.Asset` record describing the asset
   */
  function loadAssetBySymbol(string calldata assetSymbol, uint64 timestampInMs)
    external
    view
    returns (Structs.Asset memory)
  {
    return _assetRegistry.loadAssetBySymbol(assetSymbol, timestampInMs);
  }

  // Dispatcher whitelisting //

  /**
   * @notice Sets the wallet whitelisted to dispatch transactions calling the `executeTrade` and `withdraw` functions
   *
   * @param newDispatcherWallet The new whitelisted dispatcher wallet. Must be different from the current one
   */
  function setDispatcher(address newDispatcherWallet) external onlyAdmin {
    require(newDispatcherWallet != address(0x0), 'Invalid wallet address');
    require(
      newDispatcherWallet != _dispatcherWallet,
      'Must be different from current'
    );
    address oldDispatcherWallet = _dispatcherWallet;
    _dispatcherWallet = newDispatcherWallet;

    emit DispatcherChanged(oldDispatcherWallet, newDispatcherWallet);
  }

  /**
   * @notice Clears the currently set whitelisted dispatcher wallet, effectively disabling calling the
   * `executeTrade` and `withdraw` functions until a new wallet is set with `setDispatcher`
   */
  function removeDispatcher() external onlyAdmin {
    emit DispatcherChanged(_dispatcherWallet, address(0x0));
    _dispatcherWallet = address(0x0);
  }

  modifier onlyDispatcher() {
    require(msg.sender == _dispatcherWallet, 'Caller is not dispatcher');
    _;
  }

  // Private methods - validations //

  function validateOrderNonces(
    Structs.Order memory buy,
    Structs.Order memory sell
  ) private view {
    require(
      UUID.getTimestampInMsFromUuidV1(buy.nonce) >
        getLastInvalidatedTimestamp(buy.walletAddress),
      'Buy order nonce timestamp too low'
    );
    require(
      UUID.getTimestampInMsFromUuidV1(sell.nonce) >
        getLastInvalidatedTimestamp(sell.walletAddress),
      'Sell order nonce timestamp too low'
    );
  }

  function validateOrderNonce(Structs.Order memory order) private view {
    require(
      UUID.getTimestampInMsFromUuidV1(order.nonce) >
        getLastInvalidatedTimestamp(order.walletAddress),
      'Order nonce timestamp too low'
    );
  }

  // Private methods - utils //

  function getCurrentTimestampInMs() private view returns (uint64) {
    uint64 msInOneSecond = 1000;

    return uint64(block.timestamp) * msInOneSecond;
  }

  function getLastInvalidatedTimestamp(address walletAddress)
    private
    view
    returns (uint64)
  {
    if (
      _nonceInvalidations[walletAddress].exists &&
      _nonceInvalidations[walletAddress].effectiveBlockNumber <= block.number
    ) {
      return _nonceInvalidations[walletAddress].timestampInMs;
    }

    return 0;
  }

  function getOneDayFromNowInMs() private view returns (uint64) {
    uint64 secondsInOneDay = 24 * 60 * 60; // 24 hours/day * 60 min/hour * 60 seconds/min
    uint64 msInOneSecond = 1000;

    return (uint64(block.timestamp) + secondsInOneDay) * msInOneSecond;
  }
}
