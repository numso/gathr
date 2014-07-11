gathr
=====

A simple tool to help you view and use all of your apis in one spot.

still in very early alpha...

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


  preformatters: [
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
    init: function () { return 'promise|value'; },
    retrieve: function (preformatter) { return 'promise|value'; }
  };
};
```

Output

```
module.exports = function (opts) {
  return {
    id: 'type',
    contentType: 'optional content type',
    meta: {
      description: 'Description of this endpoint.',
      requests: ['example request']
    },
    path: '/path',
    init: function () { return 'promise|value'; },
    process: function (raw) { return 'promise|value'; }
  };
};
```

Decorator

```
module.exports = function (opts) {
  return {
    contentType: 'optional content type',
    meta: {
      description: 'Description of this endpoint.',
      requests: ['example request']
    },
    path: '/path',
    parent: 'type',
    init: function () { return 'promise|value'; },
    decorate: function (raw) { return 'promise|value'; }
  };
};
```

Preformatter

```
module.exports = function (opts) {
  return {
    id: 'colon',
    format: function (raw) {
      return Promise.try(function () {
        return parseFile(raw);
      });
    }
  };
};
```
