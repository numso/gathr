/* jshint node:true */
'use strict';

module.exports = cache;

var _cache = {};
var millis = 5 * 60 * 1000;

function cache(key, fn, args) {
  if (!_cache[key] || Date.now() > _cache[key].timeout) {
    _cache[key] = {
      promise: fn.apply(null, args),
      timeout: Date.now() + millis
    };
  }
  return _cache[key].promise;
}

cache.setMillis = function (_millis) {
  millis = _millis;
};
