const axios = require('axios');
const ethers = require('ethers');

const baseURL = 'http://localhost:3000';   // Change this if needed

async function createUser() {
    const sepoliaPublicKey = ethers.Wallet.createRandom().address; // Generate a random public key

    return axios.post(`${baseURL}/users`, {
        sepoliaPublicKey,
    })
        .then(response => console.log(response.data))
        .catch(err => console.error(err.response.data));
}

async function tx() {

    return axios.post(`${baseURL}/users/executeLocalTx`, {
    })
        .then(response => console.log(response.data))
        .catch(err => console.error(err.response.data));
}

tx();