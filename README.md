# Hybrid Blockchain Application: A Test for Thankspay Service

This repository comprises the implementation and evaluation of a prototype blockchain-based bill settlement service, Thankspay. Performing real-time local simulation and transferring to the Sepolia network is demonstrated using this prototype. 

## Setup and Installation
Follow these steps to set up and initiate the project:

1. Update the `.env` file with your data as follows:

  ```
  SEPOLIA_MNEMONIC=xx

  GANACHE_MNEMONIC=xx

  INFURA_ID=xx
  ```

- Ensure mnemonics for Sepolia and Ganache are identical. Provide a minimum of 4 accounts on the Sepolia test network, each charged with at least 0.1 ETH.

- Clear previous installations by executing the following commands:

  ```
  rm -rf mydb.sql
  rm -rf ./ganacheDB
  ```

2. Compile smart contracts by running:

  ```
  npx hardhat compile
  ```

3. Start ganache by running:

  ```
  npm install -g ganache
  npm run start:ganache
  ```

  These commands start the Ganache service. If you are not on a Linux-based distribution, start Ganache manually using the following command:

  ```
  ganache -p 8545 --wallet.defaultBalance 1000000000000 --miner.blockTime 0 --wallet.mnemonic "$SEPOLIA_MNEMONIC"  --chain.chainId 31337 --database.dbPath "./ganacheDB" --wallet.totalAccounts 10
  ```

4. Start the NestJS server by running:

  ```
  npm run start:dev
  ```

## Performance Tests
Our tests provide an evaluation of the two processes described in this repository's reference paper:
 
- To demonstrate **real-time local simulation**, execute:

  ```npx ts-node evaluation/demonstration/testLatency```

- To test **batch-transfer to the Sepolia network**, execute:

  ```npx ts-node evaluation/demonstration/testBatchSending```

## Extended synthetic tests

1. **Test gas costs of the batch-transfer**:

  ```
  npx hardhat test evaluation/gasCosts/service.ts
  ```

2. **Test latencies**:

  ```
  npx ts-node evaluation/latency/service.ts
  npx hardhat test evaluation/latency/normalInvocation.ts
  npx ts-node evaluation/latency/normalBatching.ts
  ```

For more details on how and why these tests are performed, please see Sections 5 (Implementation and Evaluation) in the paper.