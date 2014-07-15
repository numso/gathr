/* jshint node:true */
'use strict';

// --- Dependencies ------------------------------------------------------------

var      fs = require('fs');
var     url = require('url');
var       _ = require('lodash');
var Promise = require('bluebird');

var       u = require('util').format;

Promise.promisifyAll(fs);

// --- Initialization ----------------------------------------------------------

var config, gathrDir, gathr, gathrOpts;

exports.init = function (_gathrOpts) {
  gathrOpts = _gathrOpts || {};
  config = getConfig();
  gathr = setupGathr(config);
  return initAll();
};

// --- Serving Functions -------------------------------------------------------

exports.listen = function (port) {
  var http = require('http');
  http.createServer(exports.callback()).listen(port);
};

exports.callback = function () {
  return function (req, res) {
    var method = req.method;
    var parsed = url.parse(req.url, true);
    var pathname = parsed.pathname;
    if (method === 'GET') {
      var decs = pathname.split('/');
      decs.shift();
      var out = decs.shift();
      var qs = parsed.query;

      Promise.try(function () {
        return output(out, decs, qs);
      }).then(_success(res), _error(res));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  };
};

exports.express = function (app) {
  var url = '/:output';
  app.get(url, route);
  for (var i = 1; i < 5; ++i) {
    url += '/:decorator' + i;
    app.get(url, route);
  }
};

function route(req, res) {
  var out = req.params.output;
  var decs = [];
  if (req.params.decorator1) decs.push(req.params.decorator1);
  if (req.params.decorator2) decs.push(req.params.decorator2);
  if (req.params.decorator3) decs.push(req.params.decorator3);
  if (req.params.decorator4) decs.push(req.params.decorator4);
  var qs = req.query;
  Promise.try(function () {
    return output(out, decs, qs);
  }).then(_success(res), _error(res));
}

function _success(res) {
  return function (obj) {
    var out = obj.output;
    if (typeof out !== 'string') out = JSON.stringify(out);
    res.setHeader('Content-Type', obj.contentType);
    res.end(out);
  };
}

function _error(res) {
  return function (err) {
    console.error(err);
    res.writeHead(500);
    res.end('' + err);
  };
}

// --- Helper Functions --------------------------------------------------------

function output(outputPath, decoratorPaths, qs) {
  var out = _.findWhere(gathr.outputs, { path: outputPath });
  if (!out) throw Error(u('Outputter: %s does not exist or is not loaded.', outputPath));

  var decorators = _.map(decoratorPaths, function (decoratorPath) {
    var d = _.findWhere(gathr.decorators, { path: decoratorPath, parent: out.id });
    if (!d) throw Error(u('Decorator: %s does not exist or is not loaded.', decoratorPath));
    return d;
  });

  var inp = cache('inputs', grabAllInputs).then(function (inp) {
    return out.process(inp, qs);
  });

  var contentType = out.contentType || 'text/plain';
  return _.reduce(decorators, function (curPromise, decorator) {
    contentType = decorator.contentType || contentType;
    return curPromise.then(function (output2) {
      return decorator.decorate(output2, qs);
    });
  }, inp).then(function (finalOutput) {
    return {
      output: finalOutput,
      contentType: contentType
    };
  });
}

function grabAllInputs() {
  var promises = _.map(gathr.inputs, function (inp) {
    // put the cache in here (more granular)
    return inp.retrieve(inp.parser);
  });
  return Promise.all(promises).then(function (results) {
    return _.flatten(results);
  });
}

function getConfig() {
  gathrDir = process.env.GATHR_CONFIG_DIR || process.cwd();
  if (gathrDir.indexOf('.') === 0) {
    gathrDir = process.cwd() + '/' + gathrDir;
  }
  // load json or js, whatever exists
  // if it crashes, give an appropriate error msg
  var configPath = gathrDir + '/gathr.js';
  var config = require(configPath);
  return config;
}

function setupGathr(config) {
  var types = [
    { name: 'parsers',    fn: parseParser    },
    { name: 'inputs',     fn: parseInput     },
    { name: 'outputs',    fn: parseOutput    },
    { name: 'decorators', fn: parseDecorator }
  ];

  var gathr = {};

  _.each(types, function (type) {
    gathr[type.name] = [];
    _.each(config[type.name], function (options, filePath) {
      if (_.isArray(config[type.name])) {
        if (_.isArray(options)) {
          throw Error(u('You may only have arrays within a keyed object'));
        } else if (_.isObject(options)) {
          filePath = options.pkg;
          delete options.pkg;
        } else if (_.isString(options)) {
          filePath = options;
          options = {};
        }
      }

      if (!_.isArray(options)) options = [options];
      _.each(options, function (opts) {
        gathr[type.name].push(type.fn(filePath, opts, gathr));
      });
    });
  });

  return gathr;
}

function initAll() {
  var promises = [];
  _.each(gathr, function (collection) {
    _.each(collection, function (item) {
      promises.push(item.init());
    });
  });
  return Promise.all(promises).then(function (results) {
    // console.log(results);
    return true;
  });
}

// --- Parsers -----------------------------------------------------------------

function parseFile(filePath, opts, type) {
  // TODO:: rework how you check for node_module vs file path
  var path = filePath[0] === '.' ? gathrDir + '/' + filePath : filePath;
  var strategy;
  try {
    strategy = require(path);
  } catch (e) {
    throw Error(u('Could not load %s: %s.', type, filePath));
  }

  strategy = strategy(opts);
  if (!strategy.init) strategy.init = function () {};
  return strategy;
}

function parseParser(filePath, opts) {
  var parser = parseFile(filePath, opts, 'parser');
  if (!parser.id) throw Error(u('Parser: %s is missing it\'s id property.', filePath));
  var fn = parser.parse;
  if (!_.isFunction(fn)) throw Error(u('Parser: %s has no method: parse.', parser.id));
  parser.parse = function (raw) {
    return Promise.try(function () {
      return fn(raw);
    });
  };
  return parser;
}

function parseInput(filePath, opts, gathr) {
  var input = parseFile(filePath, opts, 'inputter');
  if (opts.parser) {
    var parser = _.findWhere(gathr.parsers, { id: opts.parser });
    if (!parser) throw Error(u('Inputter: %s depends on parser: %s which was not found.', filePath, opts.parser));
    input.parser = parser.parse;
  } else {
    input.parser = JSON.parse;
  }
  return input;
}

function parseOutput(filePath, opts) {
  var output = parseFile(filePath, opts, 'outputter');
  if (!output.id) throw Error(u('Outputter: %s is missing it\'s id property.', filePath));
  if (!output.path) throw Error(u('Outputter: %s is missing it\'s path property.', filePath));
  if (output.path[0] !== '/') throw Error(u('Outputter: %s must have a path starting with /.', filePath));
  output.path = output.path.substr(1);
  // validate output
  return output;
}

function parseDecorator(filePath, opts, gathr) {
  var decorator = parseFile(filePath, opts, 'decorator');
  if (!decorator.parent) throw Error(u('Decorator: %s missing it\'s parent property.', filePath));
  var parent = _.findWhere(gathr.outputs, { id: decorator.parent });
  if (!parent) throw Error(u('Decorator: %s wants to attach to outputter: %s which was not found.', filePath, decorator.parent));
  if (!decorator.path) throw Error(u('Decorator: %s is missing it\'s path property.', filePath));
  if (decorator.path[0] !== '/') throw Error(u('Decorator: %s must have a path starting with /.', filePath));
  decorator.path = decorator.path.substr(1);
  // validate decorator
  return decorator;
}




var _cache = {};
function cache(key, fn, args) {
  if (!_cache[key] || Date.now() > _cache[key].timeout) {
    _cache[key] = {
      promise: fn.apply(null, args),
      timeout: Date.now() + ((gathrOpts && gathrOpts.cacheMillis) || (5 * 60 * 1000))
    };
  }
  return _cache[key].promise;
}
