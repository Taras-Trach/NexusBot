import TelegramAPI from 'node-telegram-bot-api';
import axios from "axios";
import * as cheerio from "cheerio";

const startUAH = 40000;

async function getPrivat24Rate(currency: string) {
    try {
        const url = 'https://api.privatbank.ua/p24api/pubinfo?exchange&json&coursid=11';
        const response = await axios.get(url);
        const rates = response.data;
        const currencyRate = rates.find((rate: any) => rate.ccy === currency.toUpperCase());
        if (!currencyRate) {
            console.error('Currency not found:', currency);
            return undefined;
        }
        return currencyRate;
    } catch (error) {
        console.error('Error fetching the exchange rate:', error);
        return undefined;
    }
}

async function getKantorCurrencyRates(currency: string, option: 'sell' | 'buy'): Promise<number | undefined> {
    try {
        const url = `https://minfin.com.ua/ua/currency/auction/exchanger/${currency.toLowerCase()}/${option.toLowerCase()}/lvov/?order=course_desc`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const rates: number[] = [];

        $('.point-currency__rate').each((index, element) => {
            const rateBuy = $(element).find('span[data-active="true"]');
            const rateBuyNumber = parseFloat(rateBuy.text().replace(',', '.'));
            if (!isNaN(rateBuyNumber)) {
                rates.push(rateBuyNumber);
            }
        });

        if (rates.length === 0) {
            console.error('No rates found for currency:', currency);
            return undefined;
        }

        if (option === 'sell') {
            const minRate = Math.min(...rates);
            return minRate;
        } else if (option === 'buy') {
            const maxRate = Math.max(...rates);
            return maxRate;
        }
    } catch (error) {
        console.error('Error fetching currency rates:', error);
        return undefined;
    }
}

const baseRequestData = {
    fiat: 'UAH',
    page: 1,
    rows: 20,
    asset: 'USDT',
    countries: [],
    proMerchantAds: false,
    shieldMerchantAds: false,
    publisherType: null,
    payTypes: [],
    classifies: ['mass', 'profession'],
};

function createRequestData(tradeType: 'BUY' | 'SELL') {
    return { ...baseRequestData, tradeType };
}

function processOrders(orders: any[]) {
    let highestPriceOrder: any = null;
    let highestPrice = 0;

    orders.forEach(order => {
        const validBanks = ['PUMB', 'Monobank', 'Privat Bank (Universal Card)'];
        const orderBanks = order.adv.tradeMethods.map((method: any) => method.tradeMethodName);
        const hasValidBank = orderBanks.some((bank: any) => validBanks.includes(bank));

        if (order.adv.price > highestPrice && hasValidBank) {
            highestPrice = order.adv.price;
            highestPriceOrder = order;
        }
    });

    if (highestPriceOrder) {
        console.log('Найвища ціна:', highestPriceOrder.adv.price);
        console.log(`Ліміт: ${highestPriceOrder.adv.minSingleTransAmount} - ${highestPriceOrder.adv.dynamicMaxSingleTransAmount}`);
        highestPriceOrder.adv.tradeMethods.forEach((method: any) => {
            console.log('Спосіб оплати:', method.tradeMethodName);
        });
    } else {
        console.log('Ордери не знайдені');
    }
    return highestPriceOrder.adv.price;
}

async function fetchAndProcessOrders(tradeType: 'BUY' | 'SELL') {
    console.log('Початок виконання запиту...');
    const requestData = createRequestData(tradeType);

    try {
        const response = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            method: 'POST',
            body: JSON.stringify(requestData),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        console.log(tradeType === 'BUY' ? 'КУПІВЛЯ' : 'ПРОДАЖА');
        return processOrders(data.data);
    } catch (error) {
        console.error('Помилка при виконанні запиту:', error);
        return null;
    }
}


export async function exchangeObnalSchema(chatID: number, bot: TelegramAPI, currency: string) {

    const privat24Rate = await getPrivat24Rate(currency);
    const kantorRate = await getKantorCurrencyRates(currency, 'buy');

    const result = startUAH / privat24Rate.sale * 0.987 * (kantorRate ?? 0);
    const percent = ((result - startUAH) / startUAH) * 100;

    const text = `Обнал Приват/обмінник(${currency.toUpperCase()}) = ${startUAH} -> ${result.toFixed(2)}\nПрофіт: ${percent.toFixed(2)}%`;
    await bot.sendMessage(chatID, text);
}

export async function exchangeCryptoSchema(chatID: number, bot: TelegramAPI, fee: number) {
    const kantorRate = await getKantorCurrencyRates('USD', 'sell');

    const binanceRate = await fetchAndProcessOrders('SELL');

    const result = (startUAH / (kantorRate ?? 0)) * (1 - fee) * binanceRate;
    const percent = ((result - startUAH) / startUAH) * 100;

    const text = `USDT Криптообмінник/Binance = ${startUAH} -> ${result.toFixed(2)}\nПрофіт: ${percent.toFixed(2)}%`;
    await bot.sendMessage(chatID, text);
}