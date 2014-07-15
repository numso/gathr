gathr
=====

A simple tool to help you view and use all of your apis in one spot.

For a list of available strategies, check the [Wiki](../../wiki/Strategies).

still in very early alpha...

##TODO

[ ] Rework listeners to accept more than one decorator
[ ] Expose meta data for the routes that gathr itself creates
[ ] Implement some basic caching
[ ] Split project into seperate modules
[ ] Rewrite all of the documentation for readability and accuracy (with stable api)

##Description

Coming soon. Check examples for now

##Config

gathr.js

```
module.exports = {
  inputs: {
    PackageNameOrPath: 'Options'
    PackageNameOrPath: ['Options']
    PackageNameOrPath: { option: 'val' }
    PackageNameOrPath: [{ option: 'val' }]
  },


  outputs: [
    'PackageNameOrPath'
    { pkg: 'PackageNameOrPath', option: 'val' }
  ],


  decorators: [
    'PackageNameOrPath'
    { pkg: 'PackageNameOrPath', option: 'val' }
  ],


  parsers: [
    'PackageNameOrPath'
    { pkg: 'PackageNameOrPath', option: 'val' }
  ]
};
```

##Schemas

Input

```
module.exports = function (opts) {
  return {
    init: function () { return 'promise|value'; },          // (optional) Do init work. May return a promise for async work.
    retrieve: function (parser) { return 'promise|value'; } // (required) Grab data. Parse each piece with parser. May return a promise for async work.
  };
};
```

Output

```
module.exports = function (opts) {
  return {
    id: 'type',                  // (optional) Default: A random guid. If left out, decorators can not be applied.
    contentType: 'content type', // (optional) Default: 'text/plain'
    meta: {                      // (optional) To be used to generate endpoint data for this route
      description: 'Description of this endpoint.',
      requests: ['example request'],
      key: 'any other meta we decide we need for the endpoint schema'
    },
    path: '/path',                                      // (required) Used to set up an endpoint to grab this outputter
    init: function () { return 'promise|value'; },      // (optional) Do init work. May return a promise for async work.
    process: function (raw) { return 'promise|value'; } // (required) Process the raw json. May return a promise for async work.
  };
};
```

Decorator

```
module.exports = function (opts) {
  return {
    contentType: 'content type', // (optional) Default: parentOutput.contentType || 'text/plain'
    meta: {                      // (optional) To be used to generate endpoint data for this route
      description: 'Description of this endpoint.',
      requests: ['example request'],
      key: 'any other meta we decide we need for the endpoint schema'
    },
    path: '/path',                                       // (required) Used to set up an endpoint to grab this outputter
    parent: 'type',                                      // (required) The id of the outputter you wish to decorate
    init: function () { return 'promise|value'; },       // (optional) Do init work. May return a promise for async work.
    decorate: function (raw) { return 'promise|value'; } // (required) Decorate outputted json. May return a promise for async work.
  };
};
```

Parser

```
module.exports = function (opts) {
  return {
    id: 'type',                                       // (required) The id to pass into the output config options.
    init: function () { return 'promise|value'; },    // (optional) Do init work. May return a promise for async work.
    parse: function (raw) { return 'promise|value'; } // (required) Parse a chunk of data. May return a promise for async work.
  };
};
```
