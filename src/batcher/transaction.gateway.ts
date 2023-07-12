// transaction.gateway.ts

import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    MessageBody,
    ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ethers } from 'ethers';
import { BatcherService } from './batcher.service';
import { config } from 'dotenv';
import { Batch } from './entities/batch.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';

config();

@WebSocketGateway()
export class TransactionGateway {
    @WebSocketServer()
    server!: Server;
    positionNonce?: number;
    batchNonce?: number;


    constructor(private batcherService: BatcherService,
        @InjectRepository(Batch)
        private readonly batchRepository: Repository<Batch>,
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>
    ) { }

    @SubscribeMessage('parameter_request')
    async handleParameterRequest(@ConnectedSocket() client: Socket): Promise<void> {
        // simulate the nonce generation
        const { batchNonce, positionNonce } = await this.batcherService.getNextBatchAndPosition();
        const response = { positionNonce, batchNonce: batchNonce };
        client.emit('parameter_response', response);
    }

    @SubscribeMessage('transaction_submission')
    async handleTransactionSubmission(@MessageBody() data: any, @ConnectedSocket() client: Socket): Promise<void> {
        // handle txData and sigUser here
        let { txData, sigUser } = data;
        const sendTimestamp = Math.floor(Date.now() / 1000) + (10 * 24 * 60 * 60); // 10 days after current date
        const { batchNonce, positionNonce } = await this.batcherService.getNextBatchAndPosition();
        const hash = ethers.solidityPackedKeccak256(['bytes', 'uint256', 'uint256', 'uint256'], [txData, batchNonce, positionNonce, sendTimestamp]);

        // Get the private key from anywhere it might be, e.g. environment configs
        const signer = this.batcherService.getOwnerSigner();
        const sigOwner = await signer.signMessage(ethers.getBytes(hash));

        const shouldBeSignedByOwner = this.batcherService.checkIfOwnerTransaction(txData);
        const msgHash = ethers.getBytes(ethers.solidityPackedKeccak256(['bytes', 'uint256', 'uint256'], [txData, batchNonce, positionNonce]));
        if (shouldBeSignedByOwner) {
            // if the function is one of the ones that need to be signed by the owner (administrative), then change sigUser should be owner's  
            sigUser = await signer.signMessage(msgHash)
        }

        const receipt = await this.batcherService.executeOnGanache(msgHash, txData, sigUser);
        console.log(receipt);
        const response = {
            positionNonce,
            batchNonce: batchNonce,
            txData,
            sigUser,
            sigOwner,
            sendTimestamp,
            receipt
        }
        this.transactionRepository.save(response);

        client.emit('transaction_confirmation', response);
    }

    @SubscribeMessage('complete_transaction')
    handleCompleteTransaction(@ConnectedSocket() client: Socket): void {
        console.log('Transaction completed', client.id);
        client.disconnect();
    }

}