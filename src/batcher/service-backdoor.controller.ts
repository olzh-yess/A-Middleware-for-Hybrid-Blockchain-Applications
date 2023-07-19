// service-backdoor.controller.ts

import { Controller, Post, Body } from '@nestjs/common';
import { BatcherService } from './batcher.service';

/**
 * This controller is intended for testing purposes only. It should not be included in production code.
 */
@Controller('service-backdoor')
export class ServiceBackdoorController {
  constructor(private readonly batcherService: BatcherService) {}

  @Post('set-max-batch-size')
  async setMaxBatchSize(@Body('number') number: number): Promise<number> {
    return this.batcherService.setMaxBatchSize(number);
  }
}