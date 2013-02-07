/*jslint node: true */
'use strict';

var exchangeData = {}
  , exch = require('./lib/exchange')
  , nocklib = require('./lib/nocklib')
  , nockroutes = require('./routes/nockroutes.js')
  , db = require('./lib/db')
  , express = require('express')
  , timeFloor = 500
  , timeRange = 1000;

var stocks = ['NOCK1', 'NOCK2', 'NOCK3', 'NOCK4', 'NOCK5'];
var allData = [];
stocks.forEach(function(stock) {allData.push({});});

function submitRandomOrder(index) {
  var exchangeData = allData[index];
  var ord = nocklib.generateRandomOrder(exchangeData);
  ord.stock = stocks[index];
  if (ord.type === exch.BUY) {
    allData[index] = exch.buy(ord.price, ord.volume, exchangeData);
  }
  else {
    allData[index] = exch.sell(ord.price, ord.volume, exchangeData);
  }

    db.insertOne('transactions', ord, function(err, order) {
        if (exchangeData.trades && exchangeData.trades.length > 0) {
            nocklib.sendTrades(exchangeData.trades);
            var trades = exchangeData.trades.map(function(trade) {
                trade.init = (ord.type == exch.BUY) ? 'b' : 's';
                trade.stock = stocks[index];
                return trade;
            });
            nocklib.sendExchangeData(stocks[index], exchangeData);
            db.insert('transactions', trades, function(err, trades) {
                pauseThenTrade();
            });
        }
        else pauseThenTrade();
    });

    function pauseThenTrade() {
        var pause = Math.floor(Math.random() * timeRange) + timeFloor;
        setTimeout(submitRandomOrder.bind(this, index), pause);
    }
}

var app = express.createServer();
app.configure(function () {
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({secret: 'secretpasswordforsessions', store: nocklib.getSessionStore()}));
    // we first define the template directory and then EJS (Embedded JavaScript) as the templating engine.
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    // xpress.static is used to indicate the directory where we’ll store static files such as stylesheets and images
    app.use(express.static(__dirname + '/public'));
});
app.configure('development', function () {
    app.use(express.errorHandler(
        {dumpExceptions:true, showStack:true }));
});
app.configure('production', function () {
    app.use(express.errorHandler());
});

// By specifying layout: false, we indicate that no default layout is being used as a template
app.set('view options', {
    layout: false
});
//app.get('/', function(req, res) {
//    res.render('chart');
//});
app.get('/', nockroutes.getIndex);
app.post('/signup', nockroutes.signup);
app.get('/api/user/:username', nockroutes.getUser);
app.get('/portfolio', nocklib.ensureAuthenticated, nockroutes.portfolio);
app.post('/add-stock', nockroutes.addStock);
app.post('/login', nockroutes.login);

app.get('/api/trades', function(req, res) {
    db.find('transactions'
        , {init: {$exists: true}}
        , 100, function(err, trades) {
            if (err) {
                console.error(err);
                return;
            }
            var json = [];
            var lastTime = 0;
            // Highstock expects an array of arrays. Each
            // subarray of form [time, price]
            trades.reverse().forEach(function(trade) {
                var date = new Date(parseInt(trade._id
                    .toString()
                    .substring(0,8), 16)*1000);
                var dataPoint = [date.getTime(), trade.price];
                if (date - lastTime > 1000)
                    json.push(dataPoint);
                lastTime = date;
            });

            res.json(json);
        });
});
// To provide a user friendly 404 Not found msg
// Essentially, this provides a catchall, handling any request not processed by prior routes
app.use(function(req, res){
    res.render('404');
});


//submitRandomOrder();
db.open(function() {
    nocklib.createSocket(app);
    var port = process.env.PORT || 3000;
    app.listen(port);
    for(var i = 0; i < stocks.length; i++) {
        submitRandomOrder(i);
    }
});