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
import { Post, Body } from '@nestjs/common';
config();

@WebSocketGateway()
export class TransactionGateway {
    @WebSocketServer()
    server!: Server;
    positionNonce?: number;
    batchNonce?: number;
    private processingRequest: boolean = false;
    private currentTimeout: NodeJS.Timeout | null = null;


    constructor(private batcherService: BatcherService,
        @InjectRepository(Batch)
        private readonly batchRepository: Repository<Batch>,
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>
    ) { }

    @Post()
    async setMaxBatchSize(@Body() dto: any): Promise<Number> {
        return await this.batcherService.setMaxBatchSize(dto.number);
    }

    @SubscribeMessage('parameter_request')
    async handleParameterRequest(@ConnectedSocket() client: Socket): Promise<void> {
        if (this.processingRequest) {
            // If a request is already in progress, return immediately
            return;
        }

        // Set the flag to true to indicate that a request is being processed
        this.processingRequest = true;

        // simulate the nonce generation
        const { batchNonce, positionNonce } = await this.batcherService.getNextBatchAndPosition();
        const response = { positionNonce, batchNonce: batchNonce };

        // Start the timeout timer
        this.currentTimeout = setTimeout(() => {
            // After 5 seconds, set the flag back to false
            this.processingRequest = false;
            // Clear the currentTimeout
            this.currentTimeout = null;
        }, 5000); // Timeout is set to 5 seconds
        client.emit('parameter_response', response);
    }

    @SubscribeMessage('transaction_submission')
    async handleTransactionSubmission(@MessageBody() data: any, @ConnectedSocket() client: Socket): Promise<void> {

        // if a timeout was set, clear it and reset the lock
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        // handle txData and sigUser here
        let { txData, sigUser } = data;
        const sendTimestamp = Math.floor(Date.now() / 1000) + (10 * 24 * 60 * 60); // 10 days after current date
        const { batchNonce, positionNonce } = await this.batcherService.getNextBatchAndPosition();
        const hash = ethers.utils.solidityKeccak256(['bytes', 'uint256', 'uint256', 'uint256'], [txData, batchNonce, positionNonce, sendTimestamp]);


        // Get the private key from anywhere it might be, e.g. environment configs
        const signer = this.batcherService.getOwnerSigner();
        const sigOwner = await signer.signMessage(ethers.utils.arrayify(hash));


        const shouldBeSignedByOwner = this.batcherService.checkIfOwnerTransaction(txData);
        const msgHash = ethers.utils.arrayify(ethers.utils.solidityKeccak256(['bytes', 'uint256', 'uint256'], [txData, batchNonce, positionNonce]));

        if (shouldBeSignedByOwner) {
            // if the function is one of the ones that need to be signed by the owner (administrative), then change sigUser should be owner's  
            sigUser = await signer.signMessage(msgHash)
        }

        const receipt = await this.batcherService.executeOnGanache(msgHash, txData, sigUser);

        console.log("Successfully gotten the receipt!");

        let transaction = {  
            positionNonce,
            batchNonce,
            txData,
            sigUser,
            sigOwner,
            sendTimestamp,
            receipt
          }
          
          let db_transaction = this.transactionRepository.create(transaction); 
          
          await this.transactionRepository.save(db_transaction);

        this.processingRequest = false;
        client.emit('transaction_confirmation', db_transaction);
    }

    @SubscribeMessage('complete_transaction')
    handleCompleteTransaction(@ConnectedSocket() client: Socket): void {
        console.log('Transaction completed', client.id);
        client.disconnect();
    }
}