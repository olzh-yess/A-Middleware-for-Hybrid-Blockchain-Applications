const { ThanksPaySalaryToken__factory } = require("../../typechain-types");
const { ethers } = require("ethers");
const io = require('socket.io-client');

const iface = new ethers.utils.Interface(ThanksPaySalaryToken__factory.abi);
var fs = require('fs');
var path = require('path');
const axios = require('axios');

const randomSigners = async (amount: number): Promise<any[]> => {
    const signers: any[] = []
    for (let i = 0; i < amount; i++) {
        let wallet = ethers.Wallet.createRandom();
        signers.push(wallet);
    }
    return signers
}

const waitForSocketEvent = (socket: any, event: any) => {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(reject, 5000); // reject after 5 seconds
        socket.once(event, (data: any) => {
            clearTimeout(timeoutId);
            resolve(data);
        });

    });
};

const sendThroughSocket = async (batch: any) => {
    let transactions: any[] = [];
    let methodName: any;
    let batchSize = batch.signerList.length - 1;
    let BATCH_NONCE: any;

    for (let i = 0; i <= batchSize - 1; i++) {
        const param = batch.paramsList[i];
        const startTime = Date.now();
        console.log("Testing for address: ", batch.signerList[i].address);
        const socket = io('http://localhost:3000'); // point to your Nest.js application

        socket.on('connect', () => {
            console.log('Connected to server');

            // User requests parameters from server
            socket.emit('parameter_request');
        });

        socket.on('parameter_response', async (response: any) => {
            methodName = batch.name;
            let params = param; // make sure parameters match with the actual parameters of the function
            let txData = iface.encodeFunctionData(methodName, params);

            const { positionNonce, batchNonce } = response;
            BATCH_NONCE = batchNonce;

            const signer = batch.signerList[i]; // Generate a random public key
            // User signs the transaction
            const hash = ethers.utils.solidityKeccak256(['bytes', 'uint256', 'uint256'], [txData, batchNonce, positionNonce]);
            // msgHash = keccak256(abi.encodePacked(txArray[i], batchNonce, i));
            const sigUser = await signer.signMessage(ethers.utils.arrayify(hash));

            // User sends the transaction to the server
            socket.emit('transaction_submission', { txData, sigUser });
        });

        socket.on('transaction_confirmation', (confirmation: any) => {
            console.log('Received transaction_confirmation:', confirmation.batchNonce, confirmation.positionNonce);

            const latency = (Date.now() - startTime) / 1000;
            transactions.push({
                batchNonce: confirmation.batchNonce,
                positionNonce: confirmation.positionNonce,
                latency: latency
            });
            console.log(`Transaction complete. Elapsed time: ${latency} seconds`);
            socket.emit('complete_transaction');
            socket.disconnect();
        });

        // socket.once('disconnect', () => {
        //     console.log('Disconnected from server')
        //     // remove listeners to prevent memory leaks
        //     // socket.removeAllListeners('parameter_response');
        //     // socket.removeAllListeners('transaction_confirmation');
        //     // resolve(); // Resolve the current promise
        // });
        await waitForSocketEvent(socket, 'disconnect');

        const MAX_BATCH = await axios.post(`http://localhost:3000/service-backdoor/set-max-batch-size`, {
            number: batchSize -1,
        });
    }
    console.log("NEW BATCH!\n");

    return {
        name: batch.name,
        batchNonce: BATCH_NONCE,
        transactions
    }
}

let salaryAmount = ethers.utils.parseUnits("15", 10);
let mintAmount = ethers.utils.parseUnits("10", 10);
let burnAmount = ethers.utils.parseUnits("5", 10);


const runs = [...Array(10).keys()];
// 100 batch sizes1

let solutionLatency: any[] = [];

const sequentialRunExecution = async () => {
    for (let run of runs) {
        console.log("Run ", run);
        const i = run;
        const numCompanies = i + 1;
        const numWorkers = i + 1;

        const companyAccounts = await randomSigners(numCompanies);
        const workerAccounts = await randomSigners(numWorkers);

        // Batches for each function
        const batches = [
            {
                name: "addPartnerCompany",
                paramsList: companyAccounts.map((account: any) => [
                    account.address,
                ]),
                signerList: companyAccounts.map((account: any) =>
                    account,
                ),
            },
            {
                name: "addWorker",
                paramsList: workerAccounts.map((worker: any) => [
                    worker.address,
                ]),
                signerList: workerAccounts.map((worker: any) =>
                    worker,
                )
            },
            {
                name: "mintTokens",
                paramsList: workerAccounts.map((worker: any, index: any) => [
                    worker.address,
                    mintAmount,
                ]),
                signerList: workerAccounts.map((worker: any, index: any) =>
                    companyAccounts[index]
                ),
            },
            {
                name: "burnTokens",
                paramsList: workerAccounts.map((worker: any, index: any) => [
                    burnAmount,
                    companyAccounts[index].address,
                ]),
                signerList: workerAccounts.map((worker: any, index: any) =>
                    worker
                ),
            },
            {
                name: "settlePartnerDebt",
                paramsList: companyAccounts.map((company: any, index: any) => [
                    company.address
                ]),
                signerList: companyAccounts.map((company: any, index: any) =>
                    company
                ),
            },
        ];

        // Execute batches
        for (const batch of batches) {
            try {
                const { name, batchNonce, transactions } = await sendThroughSocket(batch);
                let batchSize = batch.signerList.length.toString();
                solutionLatency.push({
                    size: batchSize,
                    name,
                    batchNonce,
                    transactions
                })
            } catch (e) {
                console.log("Error:", e);
            }
        }

        var jsonPath = path.join(__dirname, '../data/solutionResults.json');

        fs.writeFile(jsonPath, JSON.stringify(solutionLatency), function (err: any) {
            if (err) {
                console.log(err);
            }
        });
    };
}

sequentialRunExecution().then(() => {
    console.log("Done!");
});