import { Injectable } from '@nestjs/common';
import { ethers, Wallet } from 'ethers';
import { ThanksPaySalaryToken__factory } from "../../typechain-types/factories/contracts/ThanksPayERC20.sol/ThanksPaySalaryToken__factory"
import { BatcherAccountable__factory } from "../../typechain-types/factories/contracts/BatcherAccountable__factory"
import * as fs from 'fs';
const ganache = require('ganache');
import path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Batch } from './entities/batch.entity';
import { Transaction } from './entities/transaction.entity';
import { Repository } from 'typeorm';
import { readJSON } from '../../utils/readJSON';
import { config } from 'dotenv';
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

        this.sepoliaProvider = new ethers.InfuraProvider('sepolia', process.env.INFURA_ID);
        this.ganacheProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');


        this.ownerSigner = ethers.Wallet.fromPhrase(mnemonic as string);
        this.sepoliaSigner = this.ownerSigner.connect(this.sepoliaProvider);
        this.ganacheSigner = this.ownerSigner.connect(this.ganacheProvider);

        // instantiate the smart contract here
        this.sepoliaBatcher = BatcherAccountable__factory.connect(
            this.addresses.sepolia.BatcherAccountable,
            this.sepoliaSigner
        );

        // instantiate the smart contract here
        this.ganacheBatcher = BatcherAccountable__factory.connect(
            this.addresses.ganache.BatcherAccountable,
            this.ganacheSigner
        );

        this.sepoliaThanksPay = ThanksPaySalaryToken__factory.connect(
            this.addresses.sepolia.ThanksPaySalaryToken,
            this.ganacheSigner
        );
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

    async executeOnGanache(messageHash: any, txData: any, sig: any) {
        let messageSigner = ethers.verifyMessage(messageHash, sig);
        console.log(messageSigner);
        const msgSender = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [messageSigner]);
        // console.log(method, address);
        const appendedData = ethers.concat([txData, msgSender]);

        console.log(msgSender, " BREAK ", appendedData);
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
        const iface = new ethers.Interface(ThanksPaySalaryToken__factory.abi);
        const parsedTransaction = iface.parseTransaction({ data: txData });
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

        let positionNonce = 0; 

        if (batch) {
            let transactions = await this.transactionRepository.find({ where: { batchNonce: batch.batchNonce }, order: { positionNonce: 'DESC' } });
            let transaction = transactions[0];
            positionNonce = transaction ? transaction.positionNonce : 0;
        }

        if (!batch || positionNonce >= this.MAX_BATCH) {
            // If there's no batch or if current one is full, create a new one
            batch = this.batchRepository.create();
            batch = await this.batchRepository.save(batch);

            positionNonce = 0;  // Reset the position nonce
        }

        return {
            batchNonce: batch.batchNonce,
            positionNonce: positionNonce + 1
        };
    }
}