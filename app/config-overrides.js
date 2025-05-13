// config-overrides.js
const { override, addWebpackResolve } = require("customize-cra");

module.exports = override(
    addWebpackResolve({
        fallback: {
            crypto: require.resolve("crypto-browserify"),
            stream: require.resolve("stream-browserify"),
        }
    })
);
