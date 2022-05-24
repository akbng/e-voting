// const HDWalletProvider = require('@truffle/hdwallet-provider');
//
// const fs = require('fs');
// const mnemonic = fs.readFileSync(".secret").toString().trim();

module.exports = {
  plugins: ["truffle-contract-size"],
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
    },
  },

  mocha: {
    timeout: 100000,
    useColors: true,
  },

  compilers: {
    solc: {
      version: "0.8.13",
      settings: {
        optimizer: {
          enabled: true,
          runs: 2000,
        },
        evmVersion: "byzantium",
      },
    },
  },
};
