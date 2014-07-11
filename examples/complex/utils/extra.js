/* jshint node:true */
'use strict';

var _ = require('lodash');

module.exports = function (opts) {
  var path = opts.path || '/extra';

  return {
    meta: {
      description: 'This decorator will attach a key to each json obj.'
    },
    path: path,
    parent: 'JSON',
    decorate: function (raw) {
      _.each(raw, function (endpoint) {
        endpoint.extra = 'woot';
      });
      return raw;
    }
  };
};
