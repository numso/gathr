/* jshint node:true */
'use strict';

module.exports = function () {
  return {
    meta: {
      description: 'This decorator will add an author name to each json obj.'
    },
    path: '/extra',
    parent: 'JSON',
    decorate: function (raw) {
      raw.forEach(function (endpoint) {
        endpoint.authorName = 'numso';
      });
      return raw;
    }
  };
};
