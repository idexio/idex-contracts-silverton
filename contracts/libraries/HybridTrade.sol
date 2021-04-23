// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.2;

import { Address } from '@openzeppelin/contracts/utils/Address.sol';
import { ECDSA } from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

import { AssetRegistry } from './AssetRegistry.sol';
import { AssetRegistryAdmin } from './AssetRegistryAdmin.sol';
import { AssetTransfers } from './AssetTransfers.sol';
import { BalanceTracking } from './BalanceTracking.sol';
import { AssetUnitConversions } from './AssetUnitConversions.sol';
import { LiquidityPoolRegistry } from './LiquidityPoolRegistry.sol';
import { PoolTradeHelpers } from './PoolTradeHelpers.sol';
import { Trading } from './Trading.sol';
import { Validations } from './Validations.sol';
import {
  Enums,
  ICustodian,
  IERC20,
  IExchange,
  Structs
} from './Interfaces.sol';
import { UUID } from './UUID.sol';

library HybridTrade {
  using BalanceTracking for BalanceTracking.Storage;
  using LiquidityPoolRegistry for LiquidityPoolRegistry.Storage;
  using PoolTradeHelpers for Structs.PoolTrade;

  function executeHybridTrade(
    Structs.Order memory buy,
    Structs.Order memory sell,
    Structs.Trade memory trade,
    Structs.PoolTrade memory poolTrade,
    address feeWallet,
    AssetRegistry.Storage storage assetRegistry,
    LiquidityPoolRegistry.Storage storage liquidityPoolRegistry,
    BalanceTracking.Storage storage balanceTracking,
    mapping(bytes32 => bool) storage completedOrderHashes,
    mapping(bytes32 => uint64) storage partiallyFilledOrderQuantitiesInPips
  ) public {
    /*
    (bytes32 buyHash, bytes32 sellHash) =
      Validations.validateHybridTrade(
        buy,
        sell,
        trade,
        poolTrade,
        assetRegistry
      );

    {
      // Pool trade
      (Structs.Order memory order, bytes32 orderHash) =
        trade.makerSide == Enums.OrderSide.Buy
          ? (sell, sellHash)
          : (buy, buyHash);
      Trading.updateOrderFilledQuantity(
        order,
        orderHash,
        poolTrade.grossBaseQuantityInPips,
        poolTrade.grossQuoteQuantityInPips,
        completedOrderHashes,
        partiallyFilledOrderQuantitiesInPips
      );
      balanceTracking.updateForPoolTrade(order, poolTrade, feeWallet);
      liquidityPoolRegistry.updateReservesForPoolTrade(poolTrade, order.side);

      // TODO Validate pool did not fill order past counterparty order's price
    }

    {
      // Counterparty trade
      Trading.updateOrderFilledQuantities(
        buy,
        buyHash,
        sell,
        sellHash,
        trade,
        completedOrderHashes,
        partiallyFilledOrderQuantitiesInPips
      );
      balanceTracking.updateForTrade(buy, sell, trade, feeWallet);
    }
    */
  }
}
