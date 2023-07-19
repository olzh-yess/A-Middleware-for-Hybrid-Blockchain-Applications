const io = require('socket.io-client');
const socket = io('http://localhost:3000'); // point to your Nest.js application
const { ethers } = require('ethers');

const { ThanksPaySalaryToken__factory } = require("../typechain-types");
const iface = new ethers.utils.Interface(ThanksPaySalaryToken__factory.abi);
var fs = require('fs');
var path = require('path');


const startTime = Date.now();


socket.on('connect', () => {
    console.log('Connected to server');

    // User requests parameters from server
    socket.emit('parameter_request');
});

socket.on('parameter_response', async (response: any) => {
    let methodName = "addPartnerCompany";
    let params = ["0xcbDaE6685104C467ec1d0170133a27AB05b4d0A0"]; // make sure parameters match with the actual parameters of the function
    let txData = iface.encodeFunctionData(methodName, params);

    const { positionNonce, batchNonce } = response;

    const signer = ethers.Wallet.createRandom(); // Generate a random public key
    // User signs the transaction
    const hash = ethers.utils.solidityKeccak256(['bytes', 'uint256', 'uint256'], [txData, batchNonce, positionNonce]);
    const sigUser = await signer.signMessage(ethers.utils.arrayify(hash));

    // User sends the transaction to the server
    socket.emit('transaction_submission', { txData, sigUser });
});

socket.on('transaction_confirmation', (confirmation: any) => {
    console.log('Received transaction_confirmation:', confirmation);

    const elapsedTime = (Date.now() - startTime) / 1000;
    console.log(`Transaction complete. Elapsed time: ${elapsedTime} seconds`);
    socket.emit('complete_transaction');
});

socket.on('disconnect', () => console.log('Disconnected from server'));