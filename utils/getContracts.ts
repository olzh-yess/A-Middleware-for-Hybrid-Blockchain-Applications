import { ThanksPaySalaryToken__factory } from "../typechain-types/factories/contracts/ThanksPayERC20.sol/ThanksPaySalaryToken__factory"
import { BatcherAccountable__factory } from "../typechain-types/factories/contracts/BatcherAccountable__factory"
import { readJSON } from './readJSON';
import { config } from 'dotenv';
import { ethers } from "ethers";
import contractAddresses from '../contract-addresses.json';

config();

export const getContract = (contractName: "ThanksPaySalaryToken" | "BatcherAccountable", networkName: "ganache" | "sepolia" | "sepoliaDirect") => {

    const addresses = contractAddresses;

    const mnemonic = process.env.SEPOLIA_MNEMONIC;

    const ownerWallet = ethers.Wallet.fromMnemonic(mnemonic as string);

    let provider;
    if (networkName == "ganache") {
        provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    }
    else if (networkName == "sepolia" || networkName == "sepoliaDirect") {
        provider = new ethers.providers.InfuraProvider('sepolia', process.env.INFURA_ID);
    }

    const signer = ownerWallet.connect(provider!);

    const factory = (contractName == "BatcherAccountable") ? BatcherAccountable__factory : ThanksPaySalaryToken__factory;

    // instantiate the smart contract here
    const contract = factory.connect(
        addresses[networkName][contractName],
        signer
    );

    return contract;
}