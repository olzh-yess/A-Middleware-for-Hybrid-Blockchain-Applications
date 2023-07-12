import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { readJSON } from "../../utils/readJSON";
import { User } from "./user.entity";
import { RegisterDto } from "./register.dto";
import { BatcherService } from "../batcher/batcher.service";
import { TransactionGateway } from '../batcher/transaction.gateway';


@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    private batcherService: BatcherService,  // Inject BatcherService
    private readonly transactionGateway: TransactionGateway
  ) { }

  async create(dto: RegisterDto) {
    let user = this.usersRepository.create();

    const keys = readJSON("../../ganacheKeys.json");

    let allKeys = Object.keys(keys["private_keys"]) as string[];
    let allValues = Object.values(keys["private_keys"]) as string[];

    // TODO: you might need to guard against going over the length of your private_keys object
    const id = await this.usersRepository.count(); // This gives us the next sequential ID value

    user.id = id;
    user.ganacheProxyKey = allValues[id];
    user.publicKey = allKeys[id];
    user.publicKey = dto.sepoliaPublicKey; // Assuming this comes from somewhere in your registration DTO

    return this.usersRepository.save(user);
  }

  // async executeLocalTx(data: any) {
  //   const user = await this.usersRepository.findOneBy({
  //     id: 1
  //   })
  //   if (!user) {
  //     console.log("User not found!");
  //   } else {
  //     console.log(user.ganacheProxyKey);
  //     const contract = this.batcherService.getGanacheThanksPay(user.ganacheProxyKey);
  //     console.log(contract);
  //   }
  // }

  parameterRequest() {
    this.transactionGateway.server.emit('parameter_request');
}

  transactionSubmission(txData: string, sigUser: string) {
      this.transactionGateway.server.emit('transaction_submission', { txData, sigUser });
  }
}