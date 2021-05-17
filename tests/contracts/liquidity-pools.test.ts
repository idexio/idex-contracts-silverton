import BigNumber from 'bignumber.js';
import { v1 as uuidv1 } from 'uuid';

import { generateOrdersAndFill } from './trade.test';
import {
  bnbAddress,
  decimalToAssetUnits,
  decimalToPips,
  getHybridTradeArguments,
  getOrderHash,
  getPoolTradeArguments,
  Order,
  OrderSide,
  OrderType,
  PoolTrade,
} from '../../lib';
import {
  CustodianInstance,
  ExchangeInstance,
  IIDEXPairInstance,
  FactoryInstance,
  TestTokenInstance,
  WETHInstance,
} from '../../types/truffle-contracts';
import {
  bnbSymbol,
  deployAndAssociateContracts,
  deployAndRegisterToken,
  getSignature,
} from './helpers';

const token0Symbol = 'DIL';
const ethMarketSymbol = `${token0Symbol}-${bnbSymbol}`;

contract.only(
  'Exchange (liquidity pools)',
  ([ownerWallet, buyWallet, sellWallet]) => {
    describe('promotePool', () => {
      it('should work', async () => {
        const depositQuantity = '1.00000000';
        const {
          custodian,
          exchange,
          token,
          wbnb,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );

        const tokenEvents = await token.getPastEvents('Transfer', {
          fromBlock: 0,
        });
        expect(tokenEvents).to.be.an('array');
        expect(tokenEvents.length).to.equal(4);
        expect(tokenEvents[2].returnValues.value).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(tokenEvents[2].returnValues.to).to.equal(exchange.address);
        expect(tokenEvents[3].returnValues.value).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(tokenEvents[3].returnValues.to).to.equal(custodian.address);

        const wbnbEvents = await wbnb.getPastEvents('Transfer', {
          fromBlock: 0,
        });
        expect(wbnbEvents).to.be.an('array');
        expect(wbnbEvents.length).to.equal(2);
        expect(wbnbEvents[1].returnValues.wad).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(wbnbEvents[1].returnValues.dst).to.equal(exchange.address);

        const pool = await exchange.loadLiquidityPoolByAssetAddresses(
          token.address,
          bnbAddress,
        );
        expect(pool.baseAssetReserveInPips).to.equal(
          decimalToPips(depositQuantity),
        );
        expect(pool.quoteAssetReserveInPips).to.equal(
          decimalToPips(depositQuantity),
        );
      });
    });

    describe('addLiquidity', () => {
      it('should work', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );

        const transferEvents = await pair.getPastEvents('Transfer', {
          fromBlock: 0,
        });
        expect(transferEvents).to.be.an('array');
        expect(transferEvents.length).to.equal(3);
        expect(transferEvents[2].returnValues.value).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );

        const mintEvents = await pair.getPastEvents('Mint', {
          fromBlock: 0,
        });
        expect(mintEvents).to.be.an('array');
        expect(mintEvents.length).to.equal(2);
        expect(mintEvents[1].returnValues.amount0).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(mintEvents[1].returnValues.amount1).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
    });

    describe('addLiquidityETH', () => {
      it('should work', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await addLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token,
        );

        const transferEvents = await pair.getPastEvents('Transfer', {
          fromBlock: 0,
        });
        expect(transferEvents).to.be.an('array');
        expect(transferEvents.length).to.equal(3);
        expect(transferEvents[2].returnValues.value).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );

        const mintEvents = await pair.getPastEvents('Mint', {
          fromBlock: 0,
        });
        expect(mintEvents).to.be.an('array');
        expect(mintEvents.length).to.equal(2);
        expect(mintEvents[1].returnValues.amount0).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(mintEvents[1].returnValues.amount1).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
    });

    describe('removeLiquidity', () => {
      it('should work', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token0,
          token1,
        } = await deployContractsAndCreateHybridPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token0,
          token1,
        );

        await removeLiquidityAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          pair,
          token0,
          token1,
        );

        const burnEvents = await pair.getPastEvents('Burn', {
          fromBlock: 0,
        });
        expect(burnEvents).to.be.an('array');
        expect(burnEvents.length).to.equal(1);
        expect(burnEvents[0].returnValues.amount0).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(burnEvents[0].returnValues.amount1).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
    });

    describe('removeLiquidityETH', () => {
      it('should work', async () => {
        const depositQuantity = '1.00000000';
        const {
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token,
        );

        await removeLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          pair,
          token,
        );

        const burnEvents = await pair.getPastEvents('Burn', {
          fromBlock: 0,
        });
        expect(burnEvents).to.be.an('array');
        expect(burnEvents.length).to.equal(1);
        expect(burnEvents[0].returnValues.amount0).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(burnEvents[0].returnValues.amount1).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
    });

    describe('removeLiquidityExit', () => {
      it('should work', async () => {
        const depositQuantity = '1.00000000';
        const depositQuantityInAssetUnits = decimalToAssetUnits(
          depositQuantity,
          18,
        );
        const {
          exchange,
          pair,
          token,
        } = await deployContractsAndCreateHybridETHPool(
          depositQuantity,
          depositQuantity,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);
        await addLiquidityETHAndExecute(
          depositQuantity,
          ownerWallet,
          exchange,
          token,
        );

        await pair.approve(exchange.address, depositQuantityInAssetUnits, {
          from: ownerWallet,
        });
        await exchange.depositTokenByAddress(
          pair.address,
          depositQuantityInAssetUnits,
        );

        await exchange.exitWallet();

        await exchange.removeLiquidityExit(token.address, bnbAddress);

        const burnEvents = await pair.getPastEvents('Burn', {
          fromBlock: 0,
        });
        expect(burnEvents).to.be.an('array');
        expect(burnEvents.length).to.equal(1);
        expect(burnEvents[0].returnValues.amount0).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
        expect(burnEvents[0].returnValues.amount1).to.equal(
          decimalToAssetUnits(depositQuantity, 18),
        );
      });
    });

    describe('executePoolTrade', () => {
      it('should work', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await deposit(exchange, token, buyWallet, '0.00000000', '1.00000000');
        const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
          token.address,
          bnbAddress,
          buyWallet,
          '909.09090909',
          '0.00121000',
        );
        poolTrade.netQuoteQuantity = '1.00000000';
        poolTrade.grossQuoteQuantity = '1.00000000';
        const buySignature = await getSignature(
          web3,
          getOrderHash(buyOrder),
          buyWallet,
        );

        // https://github.com/microsoft/TypeScript/issues/28486
        await (exchange.executePoolTrade as any)(
          ...getPoolTradeArguments(buyOrder, buySignature, poolTrade),
        );
      });
    });

    describe('executeHybridTrade', () => {
      it('should work', async () => {
        const initialBaseReserve = '10000.00000000';
        const initialQuoteReserve = '10.00000000';

        const { exchange, token } = await deployContractsAndCreateHybridETHPool(
          initialBaseReserve,
          initialQuoteReserve,
          ownerWallet,
        );
        await exchange.setDispatcher(ownerWallet);

        await deposit(exchange, token, buyWallet, '0.00000000', '10.00000000');
        await token.transfer(
          sellWallet,
          decimalToAssetUnits('5000.00000000', 18),
        );
        await deposit(
          exchange,
          token,
          sellWallet,
          '5000.00000000',
          '0.00000000',
        );

        await generateAndExecuteHybridTrade(
          exchange,
          token,
          buyWallet,
          sellWallet,
          web3,
        );

        await generateAndExecuteHybridTrade(
          exchange,
          token,
          buyWallet,
          sellWallet,
          web3,
          '0.00144000',
          '1515.15151512',
          '757.57575756',
        );
      });
    });
  },
);

async function deployContractsAndCreateHybridPool(
  initialBaseReserve: string,
  initialQuoteReserve: string,
  ownerWallet: string,
  feeWallet = ownerWallet,
) {
  const { custodian, exchange, wbnb } = await deployAndAssociateContracts();
  const token0 = await deployAndRegisterToken(exchange, token0Symbol);
  const token1 = await deployAndRegisterToken(exchange, token0Symbol);
  const { factory, pair } = await deployPancakeCoreAndCreatePool(
    ownerWallet,
    custodian,
    token0,
    token1,
    feeWallet,
  );
  await exchange.setPairFactoryAddress(factory.address);

  const pairSymbol = await pair.symbol();
  await exchange.registerToken(pair.address, pairSymbol, 18);
  await exchange.confirmTokenRegistration(pair.address, pairSymbol, 18);

  await wbnb.deposit({
    value: decimalToAssetUnits(initialQuoteReserve, 18),
    from: ownerWallet,
  });
  await token0.transfer(
    pair.address,
    decimalToAssetUnits(initialQuoteReserve, 18),
    {
      from: ownerWallet,
    },
  );
  await token1.transfer(
    pair.address,
    decimalToAssetUnits(initialBaseReserve, 18),
    {
      from: ownerWallet,
    },
  );
  await pair.mint(ownerWallet);

  await exchange.promotePool(token0.address, token1.address, pair.address);

  return { exchange, pair, token0, token1 };
}

async function deployContractsAndCreateHybridETHPool(
  initialBaseReserve: string,
  initialQuoteReserve: string,
  ownerWallet: string,
  feeWallet = ownerWallet,
) {
  const { custodian, exchange, wbnb } = await deployAndAssociateContracts();
  const token = await deployAndRegisterToken(exchange, token0Symbol);
  const { factory, pair } = await deployPancakeCoreAndCreateETHPool(
    ownerWallet,
    custodian,
    token,
    wbnb,
    feeWallet,
  );
  await exchange.setPairFactoryAddress(factory.address);

  const pairSymbol = await pair.symbol();
  await exchange.registerToken(pair.address, pairSymbol, 18);
  await exchange.confirmTokenRegistration(pair.address, pairSymbol, 18);

  await wbnb.deposit({
    value: decimalToAssetUnits(initialQuoteReserve, 18),
    from: ownerWallet,
  });
  await wbnb.transfer(
    pair.address,
    decimalToAssetUnits(initialQuoteReserve, 18),
    {
      from: ownerWallet,
    },
  );
  await token.transfer(
    pair.address,
    decimalToAssetUnits(initialBaseReserve, 18),
    {
      from: ownerWallet,
    },
  );
  await pair.mint(ownerWallet);

  await exchange.promotePool(token.address, bnbAddress, pair.address);

  return { custodian, exchange, pair, token, wbnb };
}

async function deployPancakeCoreAndCreatePool(
  ownerWallet: string,
  custodian: CustodianInstance,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
  feeWallet = ownerWallet,
): Promise<{
  factory: FactoryInstance;
  pair: IIDEXPairInstance;
}> {
  const Factory = artifacts.require('Factory');
  const IIDEXPair = artifacts.require('IIDEXPair');
  const factory = await Factory.new(feeWallet, custodian.address);

  const pairAddress = (await factory.createPair(token0.address, token1.address))
    .logs[0].args.pair;
  const pair = await IIDEXPair.at(pairAddress);

  return { factory, pair };
}

async function deployPancakeCoreAndCreateETHPool(
  ownerWallet: string,
  custodian: CustodianInstance,
  token: TestTokenInstance,
  wbnb: WETHInstance,
  feeWallet = ownerWallet,
): Promise<{
  factory: FactoryInstance;
  pair: IIDEXPairInstance;
}> {
  const Factory = artifacts.require('Factory');
  const IIDEXPair = artifacts.require('IIDEXPair');
  const factory = await Factory.new(feeWallet, custodian.address);

  const tx = await factory.createPair(token.address, wbnb.address);
  const pairAddress = tx.logs[0].args.pair;
  const pair = await IIDEXPair.at(pairAddress);

  return { factory, pair };
}

async function addLiquidityAndExecute(
  depositQuantity: string,
  ownerWallet: string,
  exchange: ExchangeInstance,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
  decimals = 18,
) {
  const depositQuantityInAssetUnits = decimalToAssetUnits(
    depositQuantity,
    decimals,
  );

  await token0.approve(exchange.address, depositQuantityInAssetUnits, {
    from: ownerWallet,
  });
  await token1.approve(exchange.address, depositQuantityInAssetUnits, {
    from: ownerWallet,
  });

  const deadline = Date.now() + 10000;
  await exchange.addLiquidity(
    token0.address,
    token1.address,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    ownerWallet,
    deadline,
  );

  await exchange.executeAddLiquidity(
    {
      signatureHashVersion: 2,
      origination: 0,
      nonce: 0,
      wallet: ownerWallet,
      assetA: token0.address,
      assetB: token1.address,
      amountADesired: depositQuantityInAssetUnits,
      amountBDesired: depositQuantityInAssetUnits,
      amountAMin: depositQuantityInAssetUnits,
      amountBMin: depositQuantityInAssetUnits,
      to: ownerWallet,
      deadline,
      signature: '0x',
    },
    {
      liquidity: depositQuantityInAssetUnits,
      amountA: depositQuantityInAssetUnits,
      amountB: depositQuantityInAssetUnits,
      feeAmountA: '0',
      feeAmountB: '0',
      baseAssetAddress: token0.address,
      quoteAssetAddress: token1.address,
    },
    { from: ownerWallet },
  );
}

async function addLiquidityETHAndExecute(
  depositQuantity: string,
  ownerWallet: string,
  exchange: ExchangeInstance,
  token: TestTokenInstance,
  decimals = 18,
) {
  const depositQuantityInAssetUnits = decimalToAssetUnits(
    depositQuantity,
    decimals,
  );

  await token.approve(exchange.address, depositQuantityInAssetUnits, {
    from: ownerWallet,
  });

  const deadline = Date.now() + 10000;
  await exchange.addLiquidityETH(
    token.address,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    ownerWallet,
    deadline,
    { value: depositQuantityInAssetUnits },
  );

  await exchange.executeAddLiquidity(
    {
      signatureHashVersion: 2,
      origination: 0,
      nonce: 0,
      wallet: ownerWallet,
      assetA: token.address,
      assetB: bnbAddress,
      amountADesired: depositQuantityInAssetUnits,
      amountBDesired: depositQuantityInAssetUnits,
      amountAMin: depositQuantityInAssetUnits,
      amountBMin: depositQuantityInAssetUnits,
      to: ownerWallet,
      deadline,
      signature: '0x',
    },
    {
      liquidity: depositQuantityInAssetUnits,
      amountA: depositQuantityInAssetUnits,
      amountB: depositQuantityInAssetUnits,
      feeAmountA: '0',
      feeAmountB: '0',
      baseAssetAddress: token.address,
      quoteAssetAddress: bnbAddress,
    },
    { from: ownerWallet },
  );
}

async function removeLiquidityAndExecute(
  depositQuantity: string,
  ownerWallet: string,
  exchange: ExchangeInstance,
  pair: IIDEXPairInstance,
  token0: TestTokenInstance,
  token1: TestTokenInstance,
  decimals = 18,
) {
  const depositQuantityInAssetUnits = decimalToAssetUnits(
    depositQuantity,
    decimals,
  );

  await pair.approve(exchange.address, depositQuantityInAssetUnits, {
    from: ownerWallet,
  });
  const deadline = Date.now() + 10000;
  await exchange.removeLiquidity(
    token0.address,
    token1.address,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    ownerWallet,
    deadline,
  );

  await exchange.executeRemoveLiquidity(
    {
      signatureHashVersion: 2,
      origination: 0,
      nonce: 0,
      wallet: ownerWallet,
      assetA: token0.address,
      assetB: token1.address,
      liquidity: depositQuantityInAssetUnits,
      amountAMin: depositQuantityInAssetUnits,
      amountBMin: depositQuantityInAssetUnits,
      to: ownerWallet,
      deadline,
      signature: '0x',
    },
    {
      liquidity: depositQuantityInAssetUnits,
      amountA: depositQuantityInAssetUnits,
      amountB: depositQuantityInAssetUnits,
      feeAmountA: '0',
      feeAmountB: '0',
      baseAssetAddress: token0.address,
      quoteAssetAddress: token1.address,
    },
    { from: ownerWallet },
  );
}

async function removeLiquidityETHAndExecute(
  depositQuantity: string,
  ownerWallet: string,
  exchange: ExchangeInstance,
  pair: IIDEXPairInstance,
  token: TestTokenInstance,
  decimals = 18,
) {
  const depositQuantityInAssetUnits = decimalToAssetUnits(
    depositQuantity,
    decimals,
  );

  await pair.approve(exchange.address, depositQuantityInAssetUnits, {
    from: ownerWallet,
  });
  const deadline = Date.now() + 10000;
  await exchange.removeLiquidityETH(
    token.address,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    depositQuantityInAssetUnits,
    ownerWallet,
    deadline,
  );

  await exchange.executeRemoveLiquidity(
    {
      signatureHashVersion: 2,
      origination: 0,
      nonce: 0,
      wallet: ownerWallet,
      assetA: token.address,
      assetB: bnbAddress,
      liquidity: depositQuantityInAssetUnits,
      amountAMin: depositQuantityInAssetUnits,
      amountBMin: depositQuantityInAssetUnits,
      to: ownerWallet,
      deadline,
      signature: '0x',
    },
    {
      liquidity: depositQuantityInAssetUnits,
      amountA: depositQuantityInAssetUnits,
      amountB: depositQuantityInAssetUnits,
      feeAmountA: '0',
      feeAmountB: '0',
      baseAssetAddress: token.address,
      quoteAssetAddress: bnbAddress,
    },
    { from: ownerWallet },
  );
}

const deposit = async (
  exchange: ExchangeInstance,
  token: TestTokenInstance,
  wallet: string,
  tokenQuantity: string,
  bnbQuantity: string,
  decimals = 18,
): Promise<void> => {
  if (decimalToAssetUnits(tokenQuantity, decimals) !== '0') {
    await token.approve(
      exchange.address,
      decimalToAssetUnits(tokenQuantity, decimals),
      {
        from: wallet,
      },
    );
    await exchange.depositTokenByAddress(
      token.address,
      decimalToAssetUnits(tokenQuantity, decimals),
      {
        from: wallet,
      },
    );
  }

  if (decimalToAssetUnits(bnbQuantity, decimals) !== '0') {
    await exchange.depositEther({
      value: decimalToAssetUnits(bnbQuantity, decimals),
      from: wallet,
    });
  }
};

const generateOrderAndPoolTrade = async (
  baseAssetAddress: string,
  quoteAssetAddress: string,
  wallet: string,
  quantity = '0.00100000',
  price = '1000.00000000', // 1000 BNB buys 1 TKN
  market = ethMarketSymbol,
): Promise<{ buyOrder: Order; poolTrade: PoolTrade }> => {
  const quoteQuantity = new BigNumber(quantity)
    .multipliedBy(new BigNumber(price))
    .toFixed(8, BigNumber.ROUND_DOWN);

  const buyOrder: Order = {
    signatureHashVersion: 2,
    nonce: uuidv1(),
    wallet,
    market,
    type: OrderType.Limit,
    side: OrderSide.Buy,
    quantity,
    isQuantityInQuote: false,
    price,
  };

  const poolTrade: PoolTrade = {
    baseAssetAddress,
    quoteAssetAddress,
    grossBaseQuantity: quantity,
    grossQuoteQuantity: quoteQuantity,
    netBaseQuantity: quantity,
    netQuoteQuantity: quoteQuantity,
    // No fee
    takerPoolFeeQuantityInPips: '0',
    takerProtocolFeeQuantityInPips: '0',
    takerGasFeeQuantityInPips: '0',
  };

  return { buyOrder, poolTrade };
};

const generateAndExecuteHybridTrade = async (
  exchange: ExchangeInstance,
  token: TestTokenInstance,
  buyWallet: string,
  sellWallet: string,
  web3: Web3,
  price = '0.00121000',
  takerOrderBaseQuantity = '1818.18181818',
  poolTradeBaseQuantity = '909.09090909',
  orderBookTradeBaseQuantity = poolTradeBaseQuantity,
  poolTradeQuoteQuantity = '1.00000000',
): Promise<void> => {
  const { buyOrder, poolTrade } = await generateOrderAndPoolTrade(
    token.address,
    bnbAddress,
    buyWallet,
    takerOrderBaseQuantity,
    price,
  );
  const buySignature = await getSignature(
    web3,
    getOrderHash(buyOrder),
    buyWallet,
  );
  poolTrade.grossBaseQuantity = poolTradeBaseQuantity;
  poolTrade.grossQuoteQuantity = poolTradeQuoteQuantity;
  poolTrade.netBaseQuantity = poolTradeBaseQuantity;
  poolTrade.netQuoteQuantity = poolTradeQuoteQuantity;

  const { sellOrder, fill } = await generateOrdersAndFill(
    token.address,
    bnbAddress,
    buyWallet,
    sellWallet,
    orderBookTradeBaseQuantity,
    price,
    ethMarketSymbol,
  );
  const sellSignature = await getSignature(
    web3,
    getOrderHash(sellOrder),
    sellWallet,
  );

  // https://github.com/microsoft/TypeScript/issues/28486
  await (exchange.executeHybridTrade as any)(
    ...getHybridTradeArguments(
      buyOrder,
      buySignature,
      sellOrder,
      sellSignature,
      fill,
      poolTrade,
    ),
  );
};
