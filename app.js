const express = require('express');
const parser = require('body-parser');

const orderBookRoutes = require('./routes/order-book');

const app = express();

app.use(parser.urlencoded({extended: false}));

app.use(orderBookRoutes);

app.listen(4333);