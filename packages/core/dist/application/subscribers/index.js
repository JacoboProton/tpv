"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAllSubscribers = registerAllSubscribers;
const order_subscribers_1 = require("./order-subscribers");
const stock_subscribers_1 = require("./stock-subscribers");
const item_subscribers_1 = require("./item-subscribers");
const payment_subscribers_1 = require("./payment-subscribers");
const order_created_subscriber_1 = require("./order-created-subscriber");
let registered = false;
function registerAllSubscribers(deps) {
    if (registered)
        return;
    registered = true;
    (0, order_subscribers_1.registerOrderSubscribers)(deps);
    (0, stock_subscribers_1.registerStockSubscribers)(deps);
    (0, item_subscribers_1.registerItemSubscribers)(deps);
    (0, payment_subscribers_1.registerPaymentSubscribers)(deps);
    (0, order_created_subscriber_1.registerOrderCreatedSubscribers)(deps);
}
