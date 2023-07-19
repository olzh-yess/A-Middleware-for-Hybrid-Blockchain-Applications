import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { BatcherService } from './batcher/batcher.service';
import { Post, Body } from '@nestjs/common';


@Controller()
export class AppController {
  constructor(private readonly RelayerService: BatcherService){}

  @Post('/register')
  async register(@Body('publicKey') publicKey: string): Promise<any> {
    // get the smart contract instance from the service
    const sepoliaRelayer = this.RelayerService.getSepoliaBatcher();
    
    // enroll in batcher
    await sepoliaRelayer.enroll(publicKey);
    const throwAwayAccount = await sepoliaRelayer.throwAwayAccounts(publicKey);

    // just returning the mapped accounts as the result of the registration
    return throwAwayAccount;
  }
}
