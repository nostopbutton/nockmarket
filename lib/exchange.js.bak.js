/*jslint node: true */
/*jslint plusplus: true */
/*jshint latedef: true */
'use strict';

var $ = require('jquery')
  , BinaryHeap = require('./BinaryHeap');

var BUY = 'buys', SELL = 'sells';

function createBinaryHeap(orderType) {
  return new BinaryHeap(function(x){
    return x;
  }, orderType);
}

function createExchange(exchangeData) {
  var cloned = $.extend(true, {}, exchangeData);
  cloned.trades = [];
  init(cloned, BUY);
  init(cloned, SELL);
  return cloned;

  function init(exchange, orderType) {
    if(!exchange[orderType]) {
      exchange[orderType] = {};
      exchange[orderType].volumes = {};
      var options = {};
      if (BUY === orderType) { options.max = true; }
      exchange[orderType].prices = createBinaryHeap(options);
    }
  }
}

module.exports = {
  BUY:BUY,
  SELL:SELL,
  buy:function(price,volume, exchangeData) {
    return order(BUY, price, volume, exchangeData);
  }, 
  sell:function(price, volume, exchangeData) {
    return order(SELL, price, volume, exchangeData);
  },
  order: order,

  getDisplay: function(exchangeData) {
    var options = {max: true}
      , buyPrices = createBinaryHeap(options)
      , sellPrices = createBinaryHeap(options)
      , buys = exchangeData.buys
      , sells = exchangeData.sells
      , price
      , sellPrice
      , buyPrice
      , trade
      , i = 0
      , padding = "        | " 
      , stringBook = "\n";


    if (sells) {      
      for (price in sells.volumes) {
        if(sell.volumes.hasOwnProperty(price)){
          sellPrices.push(price);
        }
      }
    }
    if (buys) {
      for (price in buys.volumes) {
        if(buys.volumes.hasOwnProperty(price)){
          buyPrices.push(price);
        }
      }
    }

    while (sellPrices.size() > 0) {
      sellPrice = sellPrices.pop();
      stringBook += 
        padding + sellPrice + ", " + sells.volumes[sellPrice] + "\n";
    }
    while (buyPrices.size() > 0) {
      buyPrice = buyPrices.pop();
      stringBook += buyPrice + ", " + buys.volumes[buyPrice] + "\n";
    }
    stringBook += "\n\n";
    for (i=0; exchangeData.trades 
      && i < exchangeData.trades.length; i++) {
        trade = exchangeData.trades[i];
        stringBook += 
          "TRADE " + trade.volume + " @ " + trade.price + "\n";
    }
    return stringBook;
  }
};

function order(orderType, price, volume, exchangeData) {
  //Init
  var cloned = createExchange(exchangeData)
    , orderBook = cloned[orderType]
    , oldVolume = orderBook.volumes[price]
    , newVolume
    , oppBook
    , trade = isTrade()
    , remainingVolume = volume
    , storePrice = true
    , bestOppPrice
    , bestOppVol;

  function getOpposite() {
    return (BUY === orderType) ? SELL: BUY;
  }

  function isTrade() {
    var opp = cloned[getOpposite()].prices.peek();
    return (BUY === orderType) ? price >= opp : price <= opp;
  }

  if (trade) {
    oppBook = cloned[BUY];
    if (orderType === BUY){
      oppBook = cloned[SELL];
    }

    while (remainingVolume > 0 
      && Object.keys(oppBook.volumes).length > 0) {
        bestOppPrice = oppBook.prices.peek();
        bestOppVol = oppBook.volumes[bestOppPrice];
    }
      
    if (bestOppVol > remainingVolume) {
      cloned.trades.push({price:bestOppPrice
        , volumes:remainingVolume});
      oppBook.volumes[bestOppPrice] = oppBook.volumes[bestOppPrice] - remainingVolume;
      remainingVolume = 0;
      storePrice = false;   
    } else {
      if (bestOppVol === remainingVolume) {
        storePrice = false;      
      }
      cloned.trades.push(
        {price:bestOppPrice
          , volume:oppBook.volumes[bestOppPrice]});
      remainingVolume = remainingVolume - oppBook.volumes[bestOppPrice];
      // Pop the best price from the heap
      oppBook.prices.pop();
      delete oppBook.volumes[bestOppPrice];
    }

    if(!oldVolume && storePrice) {
      cloned[orderType].prices.push(price);
    }

    newVolume = remainingVolume;

    // Add to existing volume
    if (oldVolume) {
      newVolume += oldVolume;
    }
    if(newVolume > 0) {
      orderBook.volumes[price] = newVolume;
    }
    return cloned;

  }
}