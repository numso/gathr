/* jshint node:true */
'use strict';

// --- Dependencies ------------------------------------------------------------

var      fs = require('fs');
var       _ = require('lodash');
var Promise = require('bluebird');

Promise.promisifyAll(fs);

// --- Initialization ----------------------------------------------------------

var config, gathrDir, gathr;

exports.init = function () {
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
    var handled = false;
    if (req.method === 'GET') {
      _.each(gathr.outputs, function (out) {
        if (req.url === out.path && !handled) {
          scattr(res, out);
          handled = true;
        }
      });

      _.each(gathr.decorators, function (dec) {
        if (req.url === dec.path && !handled) {
          var out = dec.parent;
          scattr(res, out, dec);
          handled = true;
        }
      });
    }
    if (!handled) {
      res.writeHead(404);
      res.end('Not Found');
    }
  };
};

exports.express = function (app) {
  _.each(gathr.outputs, function (out) {
    app.get(out.path, function (req, res) {
      scattr(res, out);
    });
  });

  _.each(gathr.decorators, function (dec) {
    app.get(dec.path, function (req, res) {
      var out = dec.parent;
      scattr(res, out, dec);
    });
  });
};

// --- Helper Functions --------------------------------------------------------

function scattr(res, out, dec) {
  grabAllInputs().then(function (inp) {
    return out.process(inp);
  }).then(function (processed) {
    if (dec) return dec.decorate(processed);
    return processed;
  }).then(function (decorated) {
    var contentType = (dec && dec.contentType) || out.contentType;
    if (contentType) res.setHeader('Content-Type', contentType);
    if (typeof processed !== 'string') decorated = JSON.stringify(decorated);
    res.end(decorated);
  });
}

function grabAllInputs() {
  var promises = _.map(gathr.inputs, function (inp) {
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
          throw Error('You may only have arrays within a keyed object');
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

function parseFile(filePath, opts) {
  // TODO:: rework how you check for node_module vs file path
  var path = filePath[0] === '.' ? gathrDir + '/' + filePath : filePath;
  console.log('requiring ' + path);
  var strategy = require(path);
  strategy = strategy(opts);
  if (!strategy.init) strategy.init = function () {};
  return strategy;
}

function parseParser(filePath, opts) {
  var parser = parseFile(filePath, opts);
  var fn = parser.parse;
  if (!fn || !_.isFunction(fn)) {
    throw Error('Parser: %s has no method: %s.', filePath, 'parse');
  }
  parser.parse = function (raw) {
    return Promise.try(function () {
      return fn(raw);
    });
  };
  return parser;
}

function parseInput(filePath, opts, gathr) {
  var input = parseFile(filePath, opts);
  if (opts.parser) {
    var parser = _.findWhere(gathr.parsers, { id: opts.parser });
    if (!parser) throw Error ('No suitable parent for parser');
    input.parser = parser.parse;
  } else {
    input.parser = JSON.parse;
  }
  return input;
}

function parseOutput(filePath, opts) {
  var output = parseFile(filePath, opts);
  // validate output
  return output;
}

function parseDecorator(filePath, opts, gathr) {
  var decorator = parseFile(filePath, opts);
  // validate decorator
  if (!decorator.parent) throw Error('Decorator missing parent prop.');
  var parent = _.findWhere(gathr.outputs, { id: decorator.parent });
  if (!parent) throw Error('No suitable parent for decorator.');
  decorator.parent = parent;
  decorator.path = parent.path + decorator.path;
  return decorator;
}
