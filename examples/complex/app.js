/* jshint node:true */
'use strict';

// require express + express middleware;
var      express = require('express');
var       morgan = require('morgan');
var errorhandler = require('errorhandler');

// require gathr
var        gathr = require('gathr');

// initialize both
gathr.init();
var app = express();

// set up express chain of command, including gathr
app.use(morgan());
gathr.express(app);
app.use(errorhandler());

// start listening
app.listen(3000);
console.log('server listening on port 3000');
