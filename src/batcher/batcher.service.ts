import { Injectable } from '@nestjs/common';
import { ethers, Wallet } from 'ethers';
import { ThanksPaySalaryToken__factory } from "../../typechain-types/factories/contracts/ThanksPayERC20.sol/ThanksPaySalaryToken__factory"
import { Relayer__factory } from "../../typechain-types/factories/contracts/Relayer__factory"
import { readJSON } from '../../utils/readJSON';
import * as fs from 'fs';
const ganache = require('ganache');
import path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Batch } from './entities/batch.entity';
import { Transaction } from './entities/transaction.entity';
import { Repository } from 'typeorm';
import { config } from 'dotenv';
import {getContract} from "../../utils/getContracts";
config();

@Injectable()
export class BatcherService {
    addresses: any;
    sepoliaProvider: any;
    ganacheProvider: any;
    sepoliaBatcher: any;
    sepoliaThanksPay: any;
    ganacheThanksPay: any;
    ganacheBatcher: any;
    ganacheSigner: any;
    sepoliaSigner: any;



    ownerSigner: any;

    positionNonce: number;
    MAX_BATCH: number;

    ownerFunctions: any[];



    ganachePrivateKeys: any;

    constructor(
        @InjectRepository(Batch)
        private readonly batchRepository: Repository<Batch>,
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) {
        this.ownerFunctions = ["addPartnerCompany", "removePartnerCompany", "addWorker", "removeWorker", "settlePartnerDebt"];
        this.positionNonce = 0;
        this.MAX_BATCH = 10;


        this.addresses = readJSON('../../contract-addresses.json');

        const mnemonic = process.env.SEPOLIA_MNEMONIC;

        console.log(mnemonic);

        this.sepoliaProvider = new ethers.providers.InfuraProvider('sepolia', process.env.INFURA_ID);
        this.ganacheProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');


        this.ownerSigner = ethers.Wallet.fromMnemonic(mnemonic as string);
        this.sepoliaSigner = this.ownerSigner.connect(this.sepoliaProvider);
        this.ganacheSigner = this.ownerSigner.connect(this.ganacheProvider);

        // instantiate the smart contract here
        this.sepoliaBatcher = getContract("Relayer", "sepolia");

        // instantiate the smart contract here
        this.ganacheBatcher = getContract("Relayer", "ganache");

        this.sepoliaThanksPay = getContract("ThanksPaySalaryToken", "sepolia");

        this.ganacheThanksPay = getContract("ThanksPaySalaryToken", "ganache");
    }

    getSepoliaBatcher() {
        return this.sepoliaBatcher;
    }

    getSepoliaThanksPay() {
        return this.sepoliaThanksPay;
    }

    getGanacheBatcher() {
        return this.ganacheBatcher;
    }

    getGanacheThanksPay() {
        return this.ganacheThanksPay;
    }

    getAddresses() {
        return this.addresses;
    }

    setMaxBatchSize(max: number) {
        this.MAX_BATCH = max;
        return this.MAX_BATCH;        
    }

    async executeOnGanache(messageHash: any, txData: any, sig: any) {
        let messageSigner = ethers.utils.verifyMessage(messageHash, sig);
        console.log("Recovered address:", messageSigner);
        const msgSender = ethers.utils.defaultAbiCoder.encode(["address"], [messageSigner]);
        // console.log(method, address);
        const appendedData = ethers.utils.hexConcat([txData, msgSender]);
        // Send transaction directly to smart contract
        let tx = {
            to: this.addresses.ganache.ThanksPaySalaryToken,
            data: appendedData
        }; 
        
        let sentTx = await this.ganacheSigner.sendTransaction(tx);
        const receipt = await sentTx.wait();
        return receipt;
    }

    checkIfOwnerTransaction(txData: any) {
        const iface = new ethers.utils.Interface(ThanksPaySalaryToken__factory.abi);
        const parsedTransaction = iface.parseTransaction({ data: txData });
        console.log("Executing function: ", parsedTransaction?.name);
        console.log("With params:", parsedTransaction.args);
        if (this.ownerFunctions.includes(parsedTransaction?.name)) {
            return true;
        } else {
            return false;
        }
    }

    getOwnerSigner() {
        return this.ownerSigner;
    }

    async getNextBatchAndPosition() {
        let batches = await this.batchRepository.find({ order: { batchNonce: "DESC" } });
        let batch = batches[0];

        let MIN_POSITION = -1; // So that when you +1 it, the smallest is zero!
        let positionNonce = MIN_POSITION; 

        if (batch) {
            let transactions = await this.transactionRepository.find({ where: { batchNonce: batch.batchNonce }, order: { positionNonce: 'DESC' } });
            let transaction = transactions[0];
            positionNonce = transaction ? transaction.positionNonce : MIN_POSITION;
        }

        if (!batch || positionNonce >= this.MAX_BATCH) {
            // If there's no batch or if current one is full, create a new one
            batch = this.batchRepository.create();
            batch = await this.batchRepository.save(batch);

            positionNonce = MIN_POSITION;  // Reset the position nonce
        }

        return {
            batchNonce: batch.batchNonce,
            positionNonce: positionNonce + 1
        };
    }
}