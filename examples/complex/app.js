/* jshint node:true */
'use strict';

var gathr = require('gathr');

gathr.init({
  include_self: true
});

gathr.listen(3000);
console.log('server listening on port 3000');
