const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const { ThanksPaySalaryToken__factory } = require("../typechain-types");
const iface = new ethers.utils.Interface(ThanksPaySalaryToken__factory.abi);

const main = async () => {
    // Setup provider and signer
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    const accounts = await provider.listAccounts();
    const signer = await provider.getSigner(accounts[0].address);

    const account = await signer.getAddress();

    // Deploy contract    
    const factory = new ethers.ContractFactory(ThanksPaySalaryToken__factory.abi, ThanksPaySalaryToken__factory.bytecode, signer);
    const contract = await factory.deploy(account);
    await contract.deployed();
    const startTime = Date.now();

    

    let txData = iface.encodeFunctionData("addPartnerCompany", [account]);


    const address = ethers.utils.defaultAbiCoder .encode(["address"], [account]);
    console.log(txData, address);
    const appendedData = ethers.utils.hexConcat([txData, address]);
    // Send transaction directly to smart contract
    let tx = {
        to: contract.address,
        data: appendedData
    }; 
    
    let sentTx = await signer.sendTransaction(tx);
    const receipt = await sentTx.wait();
    const elapsedTime = (Date.now() - startTime) / 1000;
    console.log(`Transaction complete. Elapsed time: ${elapsedTime} seconds`);
}

main().then(() => {
    console.log("DOne!");
});