// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { Address } from '@openzeppelin/contracts/utils/Address.sol';
import { ECDSA } from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

import { AssetRegistry } from './libraries/AssetRegistry.sol';
import { AssetRegistryAdmin } from './libraries/AssetRegistryAdmin.sol';
import { AssetTransfers } from './libraries/AssetTransfers.sol';
import { AssetUnitConversions } from './libraries/AssetUnitConversions.sol';
import { LiquidityPoolRegistry } from './libraries/LiquidityPoolRegistry.sol';
import { OrderValidations } from './libraries/OrderValidations.sol';
import { Owned } from './Owned.sol';
import { Signatures } from './libraries/Signatures.sol';
import {
    Enums,
    ICustodian,
    IERC20,
    IExchange,
    Structs
} from './libraries/Interfaces.sol';
import { UUID } from './libraries/UUID.sol';

/**
 * @notice The Exchange contract. Implements all deposit, trade, and withdrawal logic and associated balance tracking
 *
 * @dev The term `asset` refers collectively to BNB and ERC-20 tokens, the term `token` refers only to the latter
 * @dev Events with indexed string parameters (Deposited and TradeExecuted) only log the hash values for those
 * parameters, from which the original raw string values cannot be retrieved. For convenience these events contain
 * the un-indexed string parameter values in addition to the indexed values
 */
contract Exchange is IExchange, Owned {
    using AssetRegistry for AssetRegistry.Storage;
    using AssetRegistryAdmin for AssetRegistry.Storage;
    using LiquidityPoolRegistry for LiquidityPoolRegistry.Storage;

    // Events //

    /**
     * @notice Emitted when an admin changes the Chain Propagation Period tunable parameter with `setChainPropagationPeriod`
     */
    event ChainPropagationPeriodChanged(
        uint256 previousValue,
        uint256 newValue
    );
    /**
     * @notice Emitted when a user deposits BNB with `depositEther` or a token with `depositAsset` or `depositAssetBySymbol`
     */
    event Deposited(
        uint64 index,
        address indexed wallet,
        address indexed assetAddress,
        string indexed assetSymbolIndex,
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
     * @notice TODO
     */
    event LiquidityMint(
        address indexed sender,
        address indexed baseAssetAddress,
        address indexed quoteAssetAddress,
        uint64 baseAssetQuantityInPips,
        uint64 quoteAssetQuantityInPips,
        uint64 liquiditySharesMinted
    );
    /**
     * @notice TODO
     */
    event LiquidityBurn(
        address indexed sender,
        address indexed baseAssetAddress,
        address indexed quoteAssetAddress,
        uint64 baseAssetQuantityInPips,
        uint64 quoteAssetQuantityInPips,
        uint64 liquiditySharesBurned
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
        string indexed baseAssetSymbolIndex,
        string indexed quoteAssetSymbolIndex,
        string baseAssetSymbol,
        string quoteAssetSymbol,
        uint64 baseQuantityInPips,
        uint64 quoteQuantityInPips,
        uint64 tradePriceInPips,
        bytes32 buyOrderHash,
        bytes32 sellOrderHash
    );
    /**
     * @notice Emitted when a user invokes the Exit Wallet mechanism with `exitWallet`
     */
    event WalletExited(address indexed wallet, uint256 effectiveBlockNumber);
    /**
     * @notice Emitted when a user withdraws an asset balance through the Exit Wallet mechanism with `withdrawExit`
     */
    event WalletExitWithdrawn(
        address indexed wallet,
        address indexed assetAddress,
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
        address indexed wallet,
        address indexed assetAddress,
        string assetSymbol,
        uint64 quantityInPips,
        uint64 newExchangeBalanceInPips,
        uint256 newExchangeBalanceInAssetUnits
    );

    // Internally used structs //

    struct Balance {
        bool isMigrated;
        uint64 balanceInPips;
    }

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
    // Balance tracking - predecessor Exchange contract from which to lazily migrate balances
    IExchange immutable _balanceMigrationSource;
    // Balance tracking - mapping of wallet => asset => balance descriptor
    mapping(address => mapping(address => Balance)) _balances;
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
    // Asset registry data
    LiquidityPoolRegistry.Storage _liquidityPoolRegistry;
    // Withdrawals - mapping of withdrawal wallet hash => isComplete
    mapping(bytes32 => bool) _completedWithdrawalHashes;
    // Tunable parameters
    uint256 _chainPropagationPeriod;
    address _dispatcherWallet;
    address _feeWallet;

    // Constant values //

    uint256 constant _maxChainPropagationPeriod = (7 * 24 * 60 * 60) / 15; // 1 week at 15s/block
    uint64 constant _maxTradeFeeBasisPoints = 20 * 100; // 20%;
    uint64 constant _maxWithdrawalFeeBasisPoints = 20 * 100; // 20%;

    /**
     * @notice Instantiate a new `Exchange` contract
     *
     * @dev Sets `_balanceMigrationSource` to first argument, and `_owner` and `_admin` to `msg.sender` */
    constructor(IExchange balanceMigrationSource) Owned() {
        require(
            Address.isContract(address(balanceMigrationSource)),
            'Invalid address'
        );
        _balanceMigrationSource = balanceMigrationSource;
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
     * be less than `_maxChainPropagationPeriod`
     */
    function setChainPropagationPeriod(uint256 newChainPropagationPeriod)
        external
        onlyAdmin
    {
        require(
            newChainPropagationPeriod < _maxChainPropagationPeriod,
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
                _balances[wallet][assetAddress].balanceInPips,
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
            _assetRegistry.loadAssetBySymbol(
                assetSymbol,
                getCurrentTimestampInMs()
            );
        return
            AssetUnitConversions.pipsToAssetUnits(
                _balances[wallet][asset.assetAddress].balanceInPips,
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

        return _balances[wallet][assetAddress].balanceInPips;
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
        return _balances[wallet][assetAddress].balanceInPips;
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

    /**
     * @notice Deposit BNB
     */
    function depositEther() external payable {
        deposit(address(msg.sender), address(0x0), msg.value);
    }

    /**
     * @notice Deposit `IERC20` compliant tokens
     *
     * @param tokenAddress The token contract address
     * @param quantityInAssetUnits The quantity to deposit. The sending wallet must first call the `approve` method on
     * the token contract for at least this quantity first
     */
    function depositTokenByAddress(
        IERC20 tokenAddress,
        uint256 quantityInAssetUnits
    ) external {
        require(
            address(tokenAddress) != address(0x0),
            'Use depositEther for BNB'
        );
        deposit(
            address(msg.sender),
            address(tokenAddress),
            quantityInAssetUnits
        );
    }

    /**
     * @notice Deposit `IERC20` compliant tokens
     *
     * @param assetSymbol The case-sensitive symbol string for the token
     * @param quantityInAssetUnits The quantity to deposit. The sending wallet must first call the `approve` method on
     * the token contract for at least this quantity first
     */
    function depositTokenBySymbol(
        string calldata assetSymbol,
        uint256 quantityInAssetUnits
    ) external {
        IERC20 tokenAddress =
            IERC20(
                _assetRegistry
                    .loadAssetBySymbol(assetSymbol, getCurrentTimestampInMs())
                    .assetAddress
            );
        require(
            address(tokenAddress) != address(0x0),
            'Use depositEther for BNB'
        );

        deposit(msg.sender, address(tokenAddress), quantityInAssetUnits);
    }

    function deposit(
        address wallet,
        address assetAddress,
        uint256 quantityInAssetUnits
    ) private {
        // Calling exitWallet disables deposits immediately on mining, in contrast to withdrawals and
        // trades which respect the Chain Propagation Period given by `effectiveBlockNumber` via
        // `isWalletExitFinalized`
        require(!_walletExits[wallet].exists, 'Wallet exited');

        Structs.Asset memory asset =
            _assetRegistry.loadAssetByAddress(assetAddress);
        uint64 quantityInPips =
            AssetUnitConversions.assetUnitsToPips(
                quantityInAssetUnits,
                asset.decimals
            );
        require(quantityInPips > 0, 'Quantity is too low');

        // Convert from pips back into asset units to remove any fractional amount that is too small
        // to express in pips. If the asset is BNB, this leftover fractional amount accumulates as dust
        // in the `Exchange` contract. If the asset is a token the `Exchange` will call `transferFrom`
        // without this fractional amount and there will be no dust
        uint256 quantityInAssetUnitsWithoutFractionalPips =
            AssetUnitConversions.pipsToAssetUnits(
                quantityInPips,
                asset.decimals
            );

        // If the asset is BNB then the funds were already assigned to this contract via msg.value. If
        // the asset is a token, additionally call the transferFrom function on the token contract for
        // the pre-approved asset quantity
        if (assetAddress != address(0x0)) {
            AssetTransfers.transferFrom(
                wallet,
                IERC20(assetAddress),
                quantityInAssetUnitsWithoutFractionalPips
            );
        }
        // Forward the funds to the `Custodian`
        AssetTransfers.transferTo(
            _custodian,
            assetAddress,
            quantityInAssetUnitsWithoutFractionalPips
        );

        Balance storage balance =
            loadBalanceAndMigrateIfNeeded(wallet, assetAddress);
        uint64 newExchangeBalanceInPips =
            balance.balanceInPips + quantityInPips;
        uint256 newExchangeBalanceInAssetUnits =
            AssetUnitConversions.pipsToAssetUnits(
                newExchangeBalanceInPips,
                asset.decimals
            );

        // Update balance with actual transferred quantity
        balance.balanceInPips = newExchangeBalanceInPips;
        _depositIndex++;

        emit Deposited(
            _depositIndex,
            wallet,
            assetAddress,
            asset.symbol,
            asset.symbol,
            quantityInPips,
            newExchangeBalanceInPips,
            newExchangeBalanceInAssetUnits
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
        // Validations
        require(
            !isWalletExitFinalized(withdrawal.walletAddress),
            'Wallet exited'
        );
        require(
            OrderValidations.getFeeBasisPoints(
                withdrawal.gasFeeInPips,
                withdrawal.quantityInPips
            ) <= _maxWithdrawalFeeBasisPoints,
            'Excessive withdrawal fee'
        );
        bytes32 withdrawalHash = validateWithdrawalSignature(withdrawal);
        require(
            !_completedWithdrawalHashes[withdrawalHash],
            'Hash already withdrawn'
        );

        // If withdrawal is by asset symbol (most common) then resolve to asset address
        Structs.Asset memory asset =
            withdrawal.withdrawalType == Enums.WithdrawalType.BySymbol
                ? _assetRegistry.loadAssetBySymbol(
                    withdrawal.assetSymbol,
                    UUID.getTimestampInMsFromUuidV1(withdrawal.nonce)
                )
                : _assetRegistry.loadAssetByAddress(withdrawal.assetAddress);

        // SafeMath reverts if balance is overdrawn
        uint64 netAssetQuantityInPips =
            withdrawal.quantityInPips - withdrawal.gasFeeInPips;
        uint256 netAssetQuantityInAssetUnits =
            AssetUnitConversions.pipsToAssetUnits(
                netAssetQuantityInPips,
                asset.decimals
            );
        uint64 newExchangeBalanceInPips =
            loadBalanceAndMigrateIfNeeded(
                withdrawal
                    .walletAddress,
                asset
                    .assetAddress
            )
                .balanceInPips - withdrawal.quantityInPips;
        uint256 newExchangeBalanceInAssetUnits =
            AssetUnitConversions.pipsToAssetUnits(
                newExchangeBalanceInPips,
                asset.decimals
            );

        _balances[withdrawal.walletAddress][asset.assetAddress]
            .balanceInPips = newExchangeBalanceInPips;
        _balances[_feeWallet][asset.assetAddress].balanceInPips =
            loadBalanceAndMigrateIfNeeded(_feeWallet, asset.assetAddress)
                .balanceInPips +
            (withdrawal.gasFeeInPips);

        ICustodian(_custodian).withdraw(
            withdrawal.walletAddress,
            asset.assetAddress,
            netAssetQuantityInAssetUnits
        );

        _completedWithdrawalHashes[withdrawalHash] = true;

        emit Withdrawn(
            withdrawal.walletAddress,
            asset.assetAddress,
            asset.symbol,
            withdrawal.quantityInPips,
            newExchangeBalanceInPips,
            newExchangeBalanceInAssetUnits
        );
    }

    // Wallet exits //

    /**
     * @notice Flags the sending wallet as exited, immediately disabling deposits upon mining.
     * After the Chain Propagation Period passes trades and withdrawals are also disabled for the wallet,
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

        Structs.Asset memory asset =
            _assetRegistry.loadAssetByAddress(assetAddress);
        Balance storage balance =
            loadBalanceAndMigrateIfNeeded(msg.sender, assetAddress);
        uint256 balanceInAssetUnits =
            AssetUnitConversions.pipsToAssetUnits(
                balance.balanceInPips,
                asset.decimals
            );

        require(balanceInAssetUnits > 0, 'No balance for asset');
        balance.balanceInPips = 0;
        ICustodian(_custodian).withdraw(
            payable(msg.sender),
            assetAddress,
            balanceInAssetUnits
        );

        emit WalletExitWithdrawn(
            msg.sender,
            assetAddress,
            asset.symbol,
            balance.balanceInPips,
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

    function isWalletExitFinalized(address wallet)
        internal
        view
        returns (bool)
    {
        WalletExit storage exit = _walletExits[wallet];
        return exit.exists && exit.effectiveBlockNumber <= block.number;
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

        OrderValidations.validateAssetPair(_assetRegistry, buy, sell, trade);
        OrderValidations.validateLimitPrices(buy, sell, trade);
        validateOrderNonces(buy, sell);
        (bytes32 buyHash, bytes32 sellHash) =
            OrderValidations.validateOrderSignatures(buy, sell, trade);
        OrderValidations.validateTradeFees(trade, _maxTradeFeeBasisPoints);

        updateOrderFilledQuantities(buy, buyHash, sell, sellHash, trade);
        updateBalancesForTrade(buy, sell, trade);

        emit TradeExecuted(
            buy.walletAddress,
            sell.walletAddress,
            trade.baseAssetSymbol,
            trade.quoteAssetSymbol,
            trade.baseAssetSymbol,
            trade.quoteAssetSymbol,
            trade.grossBaseQuantityInPips,
            trade.grossQuoteQuantityInPips,
            trade.priceInPips,
            buyHash,
            sellHash
        );
    }

    function executePoolTrade(
        Structs.Order memory order,
        Structs.Trade memory trade
    ) public onlyDispatcher {
        require(
            !isWalletExitFinalized(order.walletAddress),
            'Order wallet exit finalized'
        );
        // TODO Do not validate order twice
        OrderValidations.validateAssetPair(_assetRegistry, order, order, trade);
        OrderValidations.validateLimitPrice(order, trade);
        validateOrderNonces(order, order);
        bytes32 orderHash =
            OrderValidations.validateOrderSignature(order, trade);
        OrderValidations.validateTradeFees(trade, _maxTradeFeeBasisPoints);

        updateOrderFilledQuantity(order, orderHash, trade);
        updateBalancesForPoolTrade(order, trade);
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
                _nonceInvalidations[msg.sender].effectiveBlockNumber <=
                    block.number,
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
    function loadAssetBySymbol(
        string calldata assetSymbol,
        uint64 timestampInMs
    ) external view returns (Structs.Asset memory) {
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

    // Private methods - lazy balance migration //

    function loadBalanceAndMigrateIfNeeded(address wallet, address assetAddress)
        private
        returns (Balance storage)
    {
        Balance storage balance = _balances[wallet][assetAddress];

        if (!balance.isMigrated) {
            balance.balanceInPips = _balanceMigrationSource
                .loadBalanceInPipsByAddress(wallet, assetAddress);
            balance.isMigrated = true;
        }

        return balance;
    }

    // Liquidity pool registry //

    function addLiquidityPool(
        address baseAssetAddress,
        address quoteAssetAddress
    ) external onlyAdmin {
        _liquidityPoolRegistry.addLiquidityPool(
            baseAssetAddress,
            quoteAssetAddress
        );
    }

    function addLiquidity(Structs.LiquidityDeposit memory liquidityDeposit)
        public
        onlyDispatcher
    {
        (
            address baseAssetAddress,
            address quoteAssetAddress,
            uint64 baseAssetQuantityInPips,
            uint64 quoteAssetQuantityInPips,
            uint64 liquiditySharesMinted
        ) =
            _liquidityPoolRegistry.addLiquidity(
                _assetRegistry,
                liquidityDeposit
            );

        Balance storage balance;
        balance = loadBalanceAndMigrateIfNeeded(
            liquidityDeposit.walletAddress,
            baseAssetAddress
        );
        balance.balanceInPips -= baseAssetQuantityInPips;
        balance = loadBalanceAndMigrateIfNeeded(
            liquidityDeposit.walletAddress,
            quoteAssetAddress
        );
        balance.balanceInPips -= quoteAssetQuantityInPips;

        emit LiquidityMint(
            liquidityDeposit.walletAddress,
            baseAssetAddress,
            quoteAssetAddress,
            baseAssetQuantityInPips,
            quoteAssetQuantityInPips,
            liquiditySharesMinted
        );
    }

    function removeLiquidity(
        Structs.LiquidityWithdrawal memory liquidityWithdrawal
    ) public onlyDispatcher {
        (
            address baseAssetAddress,
            address quoteAssetAddress,
            uint64 baseAssetQuantityInPips,
            uint64 quoteAssetQuantityInPips
        ) =
            _liquidityPoolRegistry.removeLiquidity(
                _assetRegistry,
                liquidityWithdrawal
            );

        Balance storage balance;
        balance = loadBalanceAndMigrateIfNeeded(
            liquidityWithdrawal.walletAddress,
            baseAssetAddress
        );
        balance.balanceInPips += baseAssetQuantityInPips;
        balance = loadBalanceAndMigrateIfNeeded(
            liquidityWithdrawal.walletAddress,
            quoteAssetAddress
        );
        balance.balanceInPips += quoteAssetQuantityInPips;

        emit LiquidityBurn(
            liquidityWithdrawal.walletAddress,
            baseAssetAddress,
            quoteAssetAddress,
            baseAssetQuantityInPips,
            quoteAssetQuantityInPips,
            liquidityWithdrawal.liquiditySharesToBurn
        );
    }

    // Private methods - trades //

    // Updates buyer, seller, and fee wallet balances for both assets in trade pair according to trade parameters
    function updateBalancesForTrade(
        Structs.Order memory buy,
        Structs.Order memory sell,
        Structs.Trade memory trade
    ) private {
        Balance storage balance;

        // Seller gives base asset including fees
        balance = loadBalanceAndMigrateIfNeeded(
            sell.walletAddress,
            trade.baseAssetAddress
        );
        balance.balanceInPips -= trade.grossBaseQuantityInPips;
        // Buyer receives base asset minus fees
        balance = loadBalanceAndMigrateIfNeeded(
            buy.walletAddress,
            trade.baseAssetAddress
        );
        balance.balanceInPips += trade.netBaseQuantityInPips;

        // Buyer gives quote asset including fees
        balance = loadBalanceAndMigrateIfNeeded(
            buy.walletAddress,
            trade.quoteAssetAddress
        );
        balance.balanceInPips -= trade.grossQuoteQuantityInPips;
        // Seller receives quote asset minus fees
        balance = loadBalanceAndMigrateIfNeeded(
            sell.walletAddress,
            trade.quoteAssetAddress
        );
        balance.balanceInPips += trade.netQuoteQuantityInPips;

        // Maker and taker fees to fee wallet
        balance = loadBalanceAndMigrateIfNeeded(
            _feeWallet,
            trade.makerFeeAssetAddress
        );
        balance.balanceInPips += trade.makerFeeQuantityInPips;
        balance = loadBalanceAndMigrateIfNeeded(
            _feeWallet,
            trade.takerFeeAssetAddress
        );
        balance.balanceInPips += trade.takerFeeQuantityInPips;
    }

    event Debug(
        uint64 baseAssetReserveInPips1,
        uint64 quoteAssetReserveInPips1,
        uint128 product1,
        uint64 baseAssetReserveInPips2,
        uint64 quoteAssetReserveInPips2,
        uint128 product2
    );

    function updateBalancesForPoolTrade(
        Structs.Order memory order,
        Structs.Trade memory trade
    ) private {
        LiquidityPoolRegistry.LiquidityPool storage pool =
            _liquidityPoolRegistry.loadLiquidityPoolByAssetAddresses(
                trade.baseAssetAddress,
                trade.quoteAssetAddress
            );

        uint128 initialProduct =
            uint128(pool.baseAssetReserveInPips) *
                uint128(pool.quoteAssetReserveInPips);
        uint64 initialBaseAssetReserveInPips = pool.baseAssetReserveInPips;
        uint64 initialQuoteAssetReserveInPips = pool.quoteAssetReserveInPips;

        Balance storage balance;
        if (order.side == Enums.OrderSide.Buy) {
            // Buyer receives base asset minus fees
            balance = loadBalanceAndMigrateIfNeeded(
                order.walletAddress,
                trade.baseAssetAddress
            );
            balance.balanceInPips += trade.netBaseQuantityInPips;
            // Buyer gives quote asset including fees
            balance = loadBalanceAndMigrateIfNeeded(
                order.walletAddress,
                trade.quoteAssetAddress
            );
            balance.balanceInPips -= trade.grossQuoteQuantityInPips;

            pool.baseAssetReserveInPips -= trade.grossBaseQuantityInPips;
            pool.quoteAssetReserveInPips += trade.grossQuoteQuantityInPips;
        } else {
            // Seller gives base asset including fees
            balance = loadBalanceAndMigrateIfNeeded(
                order.walletAddress,
                trade.baseAssetAddress
            );
            balance.balanceInPips -= trade.grossBaseQuantityInPips;
            // Seller receives quote asset minus fees
            balance = loadBalanceAndMigrateIfNeeded(
                order.walletAddress,
                trade.quoteAssetAddress
            );
            pool.baseAssetReserveInPips += trade.grossBaseQuantityInPips;
            pool.quoteAssetReserveInPips -= trade.grossQuoteQuantityInPips;
        }

        (
            uint64 adjustedBaseAssetReserveInPips,
            uint64 adjustedQuoteAssetReserveInPips
        ) =
            trade.makerSide == Enums.OrderSide.Buy
                ? (
                    pool.baseAssetReserveInPips,
                    pool.quoteAssetReserveInPips - trade.makerFeeQuantityInPips
                )
                : (
                    pool.baseAssetReserveInPips - trade.makerFeeQuantityInPips,
                    pool.quoteAssetReserveInPips
                );

        uint128 updatedProduct =
            uint128(adjustedBaseAssetReserveInPips) *
                uint128(adjustedQuoteAssetReserveInPips);

        emit Debug(
            initialBaseAssetReserveInPips,
            initialQuoteAssetReserveInPips,
            initialProduct,
            pool.baseAssetReserveInPips,
            pool.quoteAssetReserveInPips,
            updatedProduct
        );

        require(
            updatedProduct >= initialProduct,
            'Constant product cannot decrease'
        );
    }

    function updateOrderFilledQuantities(
        Structs.Order memory buyOrder,
        bytes32 buyOrderHash,
        Structs.Order memory sellOrder,
        bytes32 sellOrderHash,
        Structs.Trade memory trade
    ) private {
        updateOrderFilledQuantity(buyOrder, buyOrderHash, trade);
        updateOrderFilledQuantity(sellOrder, sellOrderHash, trade);
    }

    // Update filled quantities tracking for order to prevent over- or double-filling orders
    function updateOrderFilledQuantity(
        Structs.Order memory order,
        bytes32 orderHash,
        Structs.Trade memory trade
    ) private {
        require(!_completedOrderHashes[orderHash], 'Order double filled');

        // Total quantity of above filled as a result of all trade executions, including this one
        uint64 newFilledQuantityInPips;

        // Market orders can express quantity in quote terms, and can be partially filled by multiple
        // limit maker orders necessitating tracking partially filled amounts in quote terms to
        // determine completion
        if (order.isQuantityInQuote) {
            require(
                isMarketOrderType(order.orderType),
                'Order quote quantity only valid for market orders'
            );
            newFilledQuantityInPips =
                trade.grossQuoteQuantityInPips +
                _partiallyFilledOrderQuantitiesInPips[orderHash];
        } else {
            // All other orders track partially filled quantities in base terms
            newFilledQuantityInPips =
                trade.grossBaseQuantityInPips +
                _partiallyFilledOrderQuantitiesInPips[orderHash];
        }

        require(
            newFilledQuantityInPips <= order.quantityInPips,
            'Order overfilled'
        );

        if (newFilledQuantityInPips < order.quantityInPips) {
            // If the order was partially filled, track the new filled quantity
            _partiallyFilledOrderQuantitiesInPips[
                orderHash
            ] = newFilledQuantityInPips;
        } else {
            // If the order was completed, delete any partial fill tracking and instead track its completion
            // to prevent future double fills
            delete _partiallyFilledOrderQuantitiesInPips[orderHash];
            _completedOrderHashes[orderHash] = true;
        }
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

    function validateWithdrawalSignature(Structs.Withdrawal memory withdrawal)
        private
        pure
        returns (bytes32)
    {
        bytes32 withdrawalHash = Signatures.getWithdrawalWalletHash(withdrawal);

        require(
            Signatures.isSignatureValid(
                withdrawalHash,
                withdrawal.walletSignature,
                withdrawal.walletAddress
            ),
            'Invalid wallet signature'
        );

        return withdrawalHash;
    }

    // Private methods - utils //

    function isLimitOrderType(Enums.OrderType orderType)
        private
        pure
        returns (bool)
    {
        return
            orderType == Enums.OrderType.Limit ||
            orderType == Enums.OrderType.LimitMaker ||
            orderType == Enums.OrderType.StopLossLimit ||
            orderType == Enums.OrderType.TakeProfitLimit;
    }

    function isMarketOrderType(Enums.OrderType orderType)
        private
        pure
        returns (bool)
    {
        return
            orderType == Enums.OrderType.Market ||
            orderType == Enums.OrderType.StopLoss ||
            orderType == Enums.OrderType.TakeProfit;
    }

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
            _nonceInvalidations[walletAddress].effectiveBlockNumber <=
            block.number
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
