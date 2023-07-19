import { ethers, waffle } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";


const printTxCost = async (tx, label) => {
    const receipt = await tx.wait();
    console.log(label, receipt.gasUsed.toString());
}

const commitTimestamp = Math.floor(Date.now() / 1000) + 86400; // current time + 1 day in seconds


describe("Relayer interaction with and Test contracts", function () {
    
    let Relayer: any, TestContract;
    let owner: any, user: any, user2: any;
    let txDataList: any, userAddrs, contractAddrs: any;
    let txNumber = 20;

    beforeEach(async () => {
        // Compile and deploy the three contracts
        const RelayerFactory = await ethers.getContractFactory(
            "Relayer"
        );

        Relayer = await RelayerFactory.deploy({ value: ethers.utils.parseEther("0.01") });

        const TestContractFactory = await ethers.getContractFactory("TestContract");
        TestContract = await TestContractFactory.deploy();

        [owner, user, user2] = await ethers.getSigners();

        await Relayer.deployed();
        await TestContract.deployed();

        contractAddrs = TestContract.address;
        userAddrs = new Array(txNumber).fill(owner.address);

        // Create function selector for incrementTest() function
        const funcSelector = TestContract.interface.getSighash("incrementTest");
        // Encode transactions
        const tx = await Relayer.encodeTransactions([funcSelector], [[]]);
        txDataList = new Array(txNumber).fill(tx[0]);
    });

    it("Case 1: Owner sends correct data, user opens a dispute with correct data, owner closes it", async function () {
        this.timeout(0);

        // User proposes transactions
        const RelayerNonce = 0;
        const txNonces = Array.from({ length: txNumber }, (_, i) => i);

        const messageHashes = txNonces.map((txNonce) =>
            ethers.utils.solidityKeccak256(
                ["bytes", "uint256", "uint256"],
                [txDataList[0], RelayerNonce, txNonce]
            )
        );

        const messageHashesUser2 = txNonces.map((txNonce) =>
        ethers.utils.solidityKeccak256(
            ["bytes", "uint256", "uint256", "uint256"],
            [txDataList[0], RelayerNonce, txNonce, commitTimestamp]
        )
        );

        const user_signatures = await Promise.all(
            messageHashes.map((msgHash) => 
                owner.signMessage(ethers.utils.arrayify(msgHash))
            )
        )

        // Owner signs the transactions
        const owner_signatures = await Promise.all(
            messageHashesUser2.map((msgHash) =>
                owner.signMessage(ethers.utils.arrayify(msgHash))
            )
        );

        // Owner sends the transactions
        const tx = await Relayer.connect(owner).relayTransactions(
            contractAddrs,
            txDataList,
            user_signatures,
            RelayerNonce
        );

        await printTxCost(tx, "The cost of executing transactions");

        const receipt = await tx.wait();

        // User opens a dispute for the first transaction
        await waffle.provider.send("evm_increaseTime", [90000]);
        const dispute = await Relayer.connect(user).openDispute(
            txDataList[0],
            0,
            0,
            commitTimestamp,
            owner_signatures[0],
            { value: ethers.utils.parseEther("0.005") }
        );
        await printTxCost(dispute, "The cost of opening a dispute: ")

        // Owner resolves the dispute successfully
        const resolve = await Relayer.resolveDispute(txDataList, user.address);

        await printTxCost(resolve, "The cost of closing a dispute: ")

        // Check if dispute is removed
        expect((await Relayer.disputes(user.address)).timestamp).to.equal(0);
    });

    it("Case 2: Owner sends correct data, user tries to open a dispute with incorrect data, fails", async function () {
        this.timeout(0);

        // Enroll owner and user

        // User proposes transactions
        const RelayerNonce = 0;
        const txNonces = Array.from({ length: txNumber }, (_, i) => i);
        const messageHashes = txNonces.map((txNonce) =>
            ethers.utils.solidityKeccak256(
                ["bytes", "uint256", "uint256"],
                [txDataList[0], RelayerNonce, txNonce]
            )
        );

        // Owner signs the transactions
        const user_signatures = await Promise.all(
            messageHashes.map((msgHash) =>
                owner.signMessage(ethers.utils.arrayify(msgHash))
            )
        );

        const messageHashesUser2 = txNonces.map((txNonce) =>
        ethers.utils.solidityKeccak256(
            ["bytes", "uint256", "uint256", "uint256"],
            [txDataList[0], RelayerNonce, txNonce, commitTimestamp]
        )
        );

        // Owner signs the transactions
        const owner_signatures = await Promise.all(
            messageHashesUser2.map((msgHash) =>
                owner.signMessage(ethers.utils.arrayify(msgHash))
            )
        );

        // Owner sends the transactions
        const tx = await Relayer.connect(owner).relayTransactions(
            contractAddrs,
            txDataList,
            user_signatures,
            RelayerNonce
        );

        await printTxCost(tx, "The cost of executing transactions 2: ");

        // User tries to open a dispute with incorrect data
        await expect(
            Relayer.connect(user).openDispute(
                "0x",
                0,
                0,
                owner_signatures[0],
                { value: ethers.utils.parseEther("0.005") }
            )
        ).to.be.reverted;
    });

    it("Case 3: Owner promises two transactions but includes only one, user opens a dispute and wins", async function () {
        this.timeout(0);
      
        // Enroll owner and user
        const user1 = user;
      
        // User1 and User2 propose transactions
        const RelayerNonce = 0;
        const txNonces = Array.from({ length: txNumber }, (_, i) => i);

        const messageHashesUser1 = ethers.utils.solidityKeccak256(
            ["bytes", "uint256", "uint256"],
            [txDataList[0], RelayerNonce, 0]
          );
      
        const messageHashesUser2 = ethers.utils.solidityKeccak256(
            ["bytes", "uint256", "uint256"],
            [txDataList[0], RelayerNonce, 1]
          );
      
        // Owner signs the transactions
        const user1Signature = await Promise.all([
          user1.signMessage(ethers.utils.arrayify(messageHashesUser1))]
        );
      
        const user2Signature = await Promise.all([user2.signMessage(ethers.utils.arrayify(messageHashesUser2))]);

        const messageHashesOwner1 = ethers.utils.solidityKeccak256(
                ["bytes", "uint256", "uint256", "uint256"],
                [txDataList[0], 0, RelayerNonce, commitTimestamp]);

        const messageHashesOwner2 = ethers.utils.solidityKeccak256(
                ["bytes", "uint256", "uint256", "uint256"],
                [txDataList[0], 1, RelayerNonce, commitTimestamp]);

        // Owner signs the transactions
        const owner_signatures1 = await Promise.all([owner.signMessage(ethers.utils.arrayify(messageHashesOwner1))]);

        // Owner signs the transactions
        const owner_signatures2 = await Promise.all([owner.signMessage(ethers.utils.arrayify(messageHashesOwner2))]);
        
      
        // Include only User1's transaction but exclude User2's transaction
        const includedTransactions = [txDataList[0]];
        const includedSignatures = [user1Signature[0]];
      
        // Owner sends the transactions but includes only User1's transaction
        const tx = await Relayer.connect(owner).relayTransactions(
          contractAddrs,
          includedTransactions,
          includedSignatures,
          RelayerNonce
        );

        const receipt = await tx.wait();
      
        // User2 opens a dispute for their missing transaction with correct data
        await time.increase(90000);
        
        await Relayer.connect(user2).openDispute(
          txDataList[0],
          1,
          0, 
          commitTimestamp,
          // Change batch nonce to simulate missing user's data
          owner_signatures2[0],
          { value: ethers.utils.parseEther("0.005") }
        );
      
        // Wait for 1 day
        await time.increase(90000);
      
        // User2 claims compensation
        const claim = await Relayer.connect(user2).claimDisputeCompensation();
        await printTxCost(claim, "The cost of claiming the compensation: ");
      
        // Check if dispute is removed
        expect((await Relayer.disputes(user2.address)).timestamp).to.equal(0);
      });
});
