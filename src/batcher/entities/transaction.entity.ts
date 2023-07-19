import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Unique(['positionNonce', 'batchNonce']) // Creating unique constraint on a combination of columns
export class Transaction {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    positionNonce!: number;  // replace types with actual ones

    @Column()
    batchNonce!: number;

    @Column('text')
    txData?: string;

    @Column('text')
    sigUser?: string;

    @Column('text')
    sigOwner?: string;

    @Column('bigint')
    sendTimestamp?: number;

    @Column({type: 'json', nullable: true})
    receipt?: Record<string, any>;  // can be any shape of JSON object
}