/* jshint node:true */
'use strict';

module.exports = {
  inputs: {
    'gathr-in-files': ['./data/apis.json', './data/apis2.json'],
    'gathr-in-github': {
      user: 'numso',
      repo: 'atlas-server',
      path: 'server/routes',
      preformatter: 'colon'
    }
  },


  outputs: [
    'gathr-out-json',
  ],


  decorators: [
    './utils/extra'
  ],


  preformatters: [
    'gathr-pre-colon'
  ]
};
