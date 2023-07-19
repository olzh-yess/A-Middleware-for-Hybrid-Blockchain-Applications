"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@nomiclabs/hardhat-ethers");

// const {ethers} = require('hardhat');
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
// import { HardhatUserConfig, task } from 'hardhat/config'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-etherscan'
require("dotenv").config();
// const { task, ethers, hre } = require('hardhat');
const fs = require("fs");
const path = require("path");
const mnemonic = process.env.SEPOLIA_MNEMONIC ? process.env.SEPOLIA_MNEMONIC : "MNEMONIC NOT FOUND!";
const { ThanksPaySalaryToken__factory } = require("./typechain-types");
const { BatcherAccountable__factory } = require("./typechain-types");
// const { ethers, hre } = require("hardhat");


task("deploy", "Deploys the contract")
  .setAction(async (taskArgs: any) => {
    // Determine name of the network
    const networkName = hre.network.name;

    const [owner] = await ethers.getSigners();

    const balance = await ethers.provider.getBalance(owner.address);
    console.log("Balance is:", balance, " on the network ", networkName);

    let factory = new ethers.ContractFactory(BatcherAccountable__factory.abi, BatcherAccountable__factory.bytecode, owner);

    const batcher = await factory.deploy({ value: ethers.utils.parseUnits("0.01") });
    // const batcher = await ethers.deployContract("BatcherAccountable", [], { value: ethers.utils.parseEther("0.01") });
    await batcher.deployed();

    console.log("Deployed the batcher!")

    let trustedForwarder;
    if (networkName == "ganache") {
      trustedForwarder = owner.address;
      // console.log("Trusted forwarder is the owner, ", owner.address);
    } else {
      trustedForwarder = batcher.address;
    }

    factory = new ethers.ContractFactory(ThanksPaySalaryToken__factory.abi, ThanksPaySalaryToken__factory.bytecode, owner);
    const thanksPay = await factory.deploy(trustedForwarder);
    await thanksPay.deployed();

    const addressesPath = path.resolve(process.cwd(), `contract-addresses.json`);
    // Check if file exists already
    if (fs.existsSync(addressesPath)) {
      // File exists, read it and parse JSON
      const addresses = JSON.parse(fs.readFileSync(addressesPath));

      // Add new contract address
      addresses[networkName]["BatcherAccountable"] = batcher.address;
      addresses[networkName]["ThanksPaySalaryToken"] = thanksPay.address;

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
    sepoliaDirect: {
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