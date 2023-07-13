"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@nomiclabs/hardhat-ethers");

// const {ethers} = require('hardhat');
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import { HardhatUserConfig } from 'hardhat/config'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-etherscan'
require("dotenv").config();
// const { task, ethers, hre } = require('hardhat');
const fs = require("fs");
const path = require("path");
const mnemonic = process.env.SEPOLIA_MNEMONIC ? process.env.SEPOLIA_MNEMONIC : "MNEMONIC NOT FOUND!";


task("deploy", "Deploys the contract")
  .setAction(async (taskArgs: any) => {
    // Determine name of the network
    const networkName = hre.network.name;

    const [owner] = await ethers.getSigners();

    const balance = await ethers.provider.getBalance(owner.address);
    console.log("Balance is:", balance, " on the network ", networkName);

    const batcher = await ethers.deployContract("BatcherAccountable", [], { value: ethers.parseEther("0.01") });
    await batcher.waitForDeployment();

    let trustedForwarder;
    if (networkName == "ganache") {
      trustedForwarder = owner.address;
    } else {
      trustedForwarder = batcher.target;
    }
    const thanksPay = await ethers.deployContract("ThanksPaySalaryToken", [trustedForwarder], {});
    await thanksPay.waitForDeployment();

    const addressesPath = path.resolve(process.cwd(), `contract-addresses.json`);
    // Check if file exists already
    if (fs.existsSync(addressesPath)) {
      // File exists, read it and parse JSON
      const addresses = JSON.parse(fs.readFileSync(addressesPath));

      // Add new contract address
      addresses[networkName]["BatcherAccountable"] = batcher.target;
      addresses[networkName]["ThanksPaySalaryToken"] = thanksPay.target;
      // Write updated addresses back to file
      fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
      // console.log(`${taskArgs.contract} (${networkName}) deployed to: ${tpst.target}`);
    }
    else {
      // File does not exist, write new file
      throw new Error('File does not exist!');
    }
  });

const config = {
  solidity: "0.8.18",
  networks: {
    hardhat: {},
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: { mnemonic }
    },
    ganache: {
      url: `http://127.0.0.1:8545`,
      accounts: { mnemonic }
    }
  },
};
exports.default = config;