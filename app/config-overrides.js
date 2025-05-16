// config-overrides.js
const path = require('path');
const { override, addWebpackResolve, addWebpackModuleRule, disableEsLint } = require("customize-cra");

module.exports = override(
  disableEsLint(),
  (config) => {
    // Allow imports from outside src directory
    config.resolve.plugins = config.resolve.plugins.filter(plugin => 
      plugin.constructor.name !== 'ModuleScopePlugin'
    );
    return config;
  },
  addWebpackResolve({
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
    },
  })
);
