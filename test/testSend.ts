const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const { ThanksPaySalaryToken__factory } = require("../typechain-types");
const iface = new ethers.Interface(ThanksPaySalaryToken__factory.abi);

const main = async () => {
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    const accounts = await provider.listAccounts();
    const signer = await provider.getSigner(accounts[0].address);

    console.log(signer.address);

    // Deploy contract    
    const factory = new ethers.ContractFactory(ThanksPaySalaryToken__factory.abi, ThanksPaySalaryToken__factory.bytecode, signer);
    const contract = await factory.deploy(signer.address);
    await contract.waitForDeployment();
    const startTime = Date.now();

    let txData = iface.encodeFunctionData("addPartnerCompany", [signer.address]);


    const address = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [signer.address]);
    console.log(txData, address);
    const appendedData = ethers.concat([txData, address]);
    // Send transaction directly to smart contract
    let tx = {
        to: contract.target,
        data: appendedData
    }; 
    
    let sentTx = await signer.sendTransaction(tx);
    const receipt = await sentTx.wait();
    console.log(sentTx);
    console.log(receipt);
    const elapsedTime = (Date.now() - startTime) / 1000;
    console.log(`Transaction complete. Elapsed time: ${elapsedTime} seconds`);
}

main().then(() => {
    console.log("DOne!");
});