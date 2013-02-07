socket.on('trade', function (data) {
//    console.log(data);
});

$(document).ready(function() {
    $.get('/templates/trade-table.ejs', function(storedTemplate) {
        // we just wish to process updates after the initial load of the data has taken place
        var loaded = false;
        socket.emit('requestData', {});
        var StockModel = Backbone.Model.extend({
            updatePrices: function(deltas) {
                this.set({deltas: deltas});
            }
        });
        var StockCollection = Backbone.Collection.extend({
            model: StockModel
        });
        // Then we define the overall view
        var StockView = Backbone.View.extend({
            initialize: function() {
                var self = this;
                self.render();
            },
            render: function() {
                for (var i=0; i<window.stockCollection.models.length; i++) {
                    var data = window.stockCollection.models[i];
                    var rowView = new StockRowView({model: data});
                    $('.stock-data').append(rowView.render().el);
                }
            }
        });
        // The individual row view is defined as follows
        var StockRowView = Backbone.View.extend({
            tagName: 'tr',
            initialize: function() {
                _.bindAll(this, 'setPrices');
                this.model.bind('change', this.setPrices);
            },
            render: function() {
                // Instead of using a string as the template,
                // we use the stored template that we have retrieved
                // through jQuery’s get function
                var template = _.template(storedTemplate);
                var htmlString = template(this.model.toJSON());
                $(this.el).html(htmlString);
                return this;
            },
            setPrices: function() {
                var color = "#82FA58";
                var prices = this.model.toJSON().deltas;
                for (var attr in prices) {
                    var value = prices[attr];
                    if (value > 0) {
                        if (attr == 'tp') {
                            $('#' + prices.st + 'trade-cell')
                                .css("backgroundColor", color);
                            $('#' + prices.st + 'trade-cell')
                                .animate({backgroundColor: "white"}, 1000);
                        }
                        $('#' + prices.st + attr).html(value);
                    }
                }
            }
        });
        // When the data is updated, all we need to do is retrieve the model and subsequently call an update function
        socket.on('exchangeData', function (deltas) {
            if (loaded) {
                var model = window.stockCollection.get(deltas.st);
                model.updatePrices(deltas);
            }
        });
        // we handle the initial data transmission from the server
        socket.on('initExchangeData', function (data) {
            window.stockCollection = new StockCollection();
            for (var stock in data.exchangeData) {
                var stockModel = new StockModel(data.exchangeData[stock]);
                stockModel.set({id: data.exchangeData[stock].st});
                window.stockCollection.push(stockModel);
            }
            // We set 'loaded' to true once we’ve processed the initial data
            loaded = true;
            new StockView();
        });
    });
});