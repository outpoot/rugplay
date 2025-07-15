export function AMMBuy(poolCoinAmount: number, poolBaseCurrencyAmount: number, money: number) {
    const k = poolCoinAmount * poolBaseCurrencyAmount;
    const newPoolBaseCurrency = poolBaseCurrencyAmount + money;
    const newPoolCoin = k / newPoolBaseCurrency;
    return poolCoinAmount - newPoolCoin;
}

export function AMMSell(poolCoinAmount: number, poolBaseCurrencyAmount: number, quantity: number) {
    const k = poolCoinAmount * poolBaseCurrencyAmount;
    const newPoolCoin = poolCoinAmount + quantity;
    const newPoolBaseCurrency = k / newPoolCoin;
    return poolBaseCurrencyAmount - newPoolBaseCurrency;
}
