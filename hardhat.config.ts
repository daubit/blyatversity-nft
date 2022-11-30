import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-solhint";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-ethernal";
import "hardhat-contract-sizer";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@nomiclabs/hardhat-solpp";

dotenv.config();

const MNEMONIC = process.env.MNEMONIC;
const ALCHEMY_KEY_MAINNET = process.env.ALCHEMY_KEY_MAINNET;
const ALCHEMY_KEY_TESTNET = process.env.ALCHEMY_KEY_TESTNET;
const mumbaiNodeUrl = `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_KEY_TESTNET}`;
const polygonNodeUrl = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_MAINNET}`;
const evmosNodeUrl = `https://eth.bd.evmos.org:8545`;
const evmosDevNodeUrl = `https://eth.bd.evmos.dev:8545`;
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    mumbai: { url: mumbaiNodeUrl, accounts: { mnemonic: MNEMONIC } },
    polygon: { url: polygonNodeUrl, accounts: { mnemonic: MNEMONIC } },
    evmos: {
      url: evmosNodeUrl,
      accounts: { mnemonic: MNEMONIC },
    },
    evmosdev: {
      url: evmosDevNodeUrl,
      accounts: {
        mnemonic: MNEMONIC,
      },
    },
    evmoslocal: {
      url: "http://localhost:8080",
      accounts: {
        mnemonic: MNEMONIC,
      },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYSCAN_KEY!,
      polygonMumbai: process.env.POLYSCAN_KEY!,
    },
  },
  // @ts-ignore
  ethernal: {
    email: process.env.ETHERNAL_EMAIL,
    password: process.env.ETHERNAL_PASSWORD,
    uploadAst: true,
    resetOnStart: "localhost",
    workspace: "localhost",
    disabled: true,
  },
  ethernalAstUpload: true,
  solpp: {
    defs: { OPENSEA_POLYGON: process.env.OPENSEA_POLYGON },
  },
};
export default config;

task(
  "accounts",
  "Prints the list of accounts",
  async (_args, hre: HardhatRuntimeEnvironment) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
      console.log(account.address);
      console.log(await account.getBalance());
    }
  }
);
