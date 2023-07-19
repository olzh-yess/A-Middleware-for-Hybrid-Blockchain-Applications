import { createConnection, getRepository } from 'typeorm';
import { Batch } from "../../src/batcher/entities/batch.entity";
import { Transaction } from "../../src/batcher/entities/transaction.entity";
import { getContract } from '../../utils/getContracts';
import { Relayer } from '../../typechain-types/contracts/Relayer';
import { ThanksPaySalaryToken__factory } from '../../typechain-types';
import { readJSON } from '../../utils/readJSON';
import { ethers } from 'ethers';
import path from 'path';
var fs = require('fs');


const readBatch = async () => {
    const connection = await createConnection({
        type: "sqlite",
        database: "./mydb.sql",
        entities: [
            Batch,
            Transaction
        ],
        synchronize: true,
    });

    const batchRepository = getRepository(Batch);
    const transactionRepository = getRepository(Transaction);

    let batches = await batchRepository.find({ order: { batchNonce: "ASC" } });


    let sigs: any, txData: any, batchNonce: any, positionNonces: any;
    let formattedBatches: any[] = [];

    for (let batch of batches) {
        let transactions = await transactionRepository.find({ where: { batchNonce: batch.batchNonce }, order: { positionNonce: 'ASC' } });
        sigs = transactions.map(transaction => transaction.sigUser);
        positionNonces = transactions.map(transaction => transaction.positionNonce);
        txData = transactions.map(transaction => transaction.txData);
        batchNonce = batch.batchNonce;


        formattedBatches.push({
            sigs,
            txData,
            batchNonce,
            positionNonces
        })
    }
    return formattedBatches;
}



const sendBatches = async (networkName: "ganache" | "sepolia") => {
    let solutionResults = readJSON("../test/data/solutionResults.json");
    const formattedBatches = await readBatch();
    const batcher = getContract("Relayer", networkName) as Relayer;

    const addresses = readJSON('../contract-addresses.json');

    for (let batch of formattedBatches) {
        console.log(batch);
        const iface = new ethers.utils.Interface(ThanksPaySalaryToken__factory.abi);
        const parsedTransaction = iface.parseTransaction({ data: batch.txData[0] });
        console.log(parsedTransaction.args);

        console.log("Recovered messenger: ", ethers.utils.verifyMessage(ethers.utils.arrayify(ethers.utils.solidityKeccak256(["bytes", "uint256", "uint256"], [
            batch.txData[0],
            batch.batchNonce,
            0
            ])), batch.sigs[0]));
        try {
            const tx = await batcher.relayTransactions(
                addresses[networkName].ThanksPaySalaryToken,
                batch.txData,
                batch.sigs,
                batch.batchNonce
            );
            const receipt = await tx.wait();

            solutionResults = solutionResults.map((obj: any) => (
                obj.batchNonce == batch.batchNonce ?
                { 
                  ...obj, 
                  gasCost: receipt.gasUsed.toString(), 
                  sepoliaTxHash: receipt.transactionHash
                } : 
                obj
              ));

            console.log("Successfully sent!");

        } catch (error: any) {
            const errorData = error.error.error;
            console.log('Reason:', errorData.reason);
            console.log('Message:', errorData.message);
            break;
        }
    }

    var jsonPath = path.join(__dirname, '../data/solutionResults.json');

    fs.writeFile(jsonPath, JSON.stringify(solutionResults), function (err: any) {
        if (err) {
            console.log(err);
        }
    });
}

sendBatches("sepolia").then(() => {
    console.log("Done!");
})