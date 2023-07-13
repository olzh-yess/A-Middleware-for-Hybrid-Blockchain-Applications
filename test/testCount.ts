const ethers = require('ethers');
const { Counter__factory } = require("../typechain-types");

const main = async () => {
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const accounts = await provider.listAccounts();
    const signer = await provider.getSigner(accounts[0].address);

    console.log('Signer address:', signer.address);

    // Deploy contract    
    const factory = new ethers.ContractFactory(Counter__factory.abi, Counter__factory.bytecode, signer);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    console.log('Contract deployed at:', contract.target);

    
    const startTime = Date.now();

    // Call increment function directly
    const incrementTx = await contract.increment();
    await incrementTx.wait();

    const elapsedTime = (Date.now() - startTime) / 1000;
    console.log(`Transaction complete. Elapsed time: ${elapsedTime} seconds`);

}

main().then(() => {
    console.log("Done!");
}).catch((error) => {
    console.error(error);
    process.exit(1);
});