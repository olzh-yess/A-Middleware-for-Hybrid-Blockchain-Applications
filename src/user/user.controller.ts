// user.controller.ts

import { Controller, Post, Body } from "@nestjs/common";
import { UsersService } from "./user.service";
import { User } from "./user.entity";
import { RegisterDto } from "./register.dto";

@Controller('users')
export class UsersController {

  constructor(private userService: UsersService) {}

  @Post()
  async create(@Body() dto: RegisterDto): Promise<User> {
    return await this.userService.create(dto);
  }
}