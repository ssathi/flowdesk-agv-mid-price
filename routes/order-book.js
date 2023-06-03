const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const currency = require('currency.js');

const router = express.Router();

var exchangesRestApis = [
    {
        name: 'Binance',
        url: 'https://api.binance.com/api/v3/depth?limit=10&symbol=BTCUSDT',
        apiType: 'REST'
    },
    {
        name: 'Huobi',
        url: 'https://open.huobigroup.com/market/depth?symbol=btcusdt&depth=10&type=step0',
        apiType: 'REST'
    }
];

router.get('/avg-mid-price', (req, res, next) => {

    var midPrices = [];

    var requests = [];
    exchangesRestApis.filter(ex => ex.apiType === 'REST').forEach(exchange => {
        requests.push(axios.get(exchange.url));
    });

    // since every api is going to have different response
    // It is not possible to generalize the response handling logic
    Promise.all(requests)
        .then(responses => {
            // Binance
            const bids1 = responses[0].data.bids;
            const asks1 = responses[0].data.asks;

            const lastBid1 = bids1[bids1.length - 1];
            const firstAsk1 = asks1[0];

            const midPrice1 = currency(lastBid1[0])
                .add(currency(firstAsk1[0]))
                .divide(2);

            midPrices.push(midPrice1);

            //Huobi
            const bids2 = responses[1].data.tick.bids;
            const asks2 = responses[1].data.tick.asks;

            const lastBid2 = bids2[bids2.length - 1];
            const firstAsk2 = asks2[0];

            const midPrice2 = currency(lastBid2[0])
                .add(currency(firstAsk2[0]))
                .divide(2);

            midPrices.push(midPrice2);

        });


    // since every api is going to have different response
    // It is not possible to generalize the response handling logic
    const ws = new WebSocket('wss://ws.kraken.com');

    ws.on('open', function open() {
        ws.send('{ "event":"subscribe", "subscription":{"name":"book"},"pair":["XBT/USD"] }');
    });

    ws.on('message', function incoming(wsMsg) {
        if (wsMsg.includes('as') && wsMsg.includes('bs')) {

            const snapshot = JSON.parse(wsMsg)[1];
            const bids = snapshot.bs;
            const asks = snapshot.as;

            const lastBid = bids[bids.length - 1];
            const firstAsk = asks[0];

            const midPrice = currency(lastBid[0])
                .add(currency(firstAsk[0]))
                .divide(2);

            midPrices.push(midPrice);

            // if having many websokcets, could have a counter to check for the number of responses
            // to make sure all responses are considered before sending the results
            res.send(getResponse(midPrices));
            ws.terminate();
        }

    });

});

function getResponse(midPrices) {
    if (midPrices.length === 0) {
        return { message: 'Unable to get mid prices!' };
    } else {
        let sum = currency(0);
        midPrices.forEach(val => sum = sum.add(val));
        const avg = sum.divide(midPrices.length);
        console.log('Avg mid price: ' + avg);
        return { averageMidPrice: avg };
    }
}

module.exports = router;