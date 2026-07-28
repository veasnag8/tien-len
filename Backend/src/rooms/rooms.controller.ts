import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length } from 'class-validator';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

class CreateRoomDto {
  @IsOptional()
  @IsInt()
  @IsIn([2, 3, 4])
  maxPlayers?: 2 | 3 | 4;

  @IsOptional()
  @IsBoolean()
  allowFiveConsecutivePairs?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  /** Turn auto-pass timeout in ms (default 30000 = 30s) */
  @IsOptional()
  @IsInt()
  @IsIn([30_000])
  turnTimeoutMs?: number;

  /** Optional custom room code (3–6 alphanumeric characters). */
  @IsOptional()
  @IsString()
  @Length(3, 6)
  customCode?: string;

  /** Alias for customCode (same rules). */
  @IsOptional()
  @IsString()
  @Length(3, 6)
  code?: string;
}

class JoinRoomDto {
  @IsString()
  @Length(3, 6)
  code!: string;
}

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateRoomDto) {
    return this.rooms.createRoom(user.id, {
      ...dto,
      customCode: dto.customCode ?? dto.code,
    });
  }

  @Post('join')
  join(@CurrentUser() user: User, @Body() dto: JoinRoomDto) {
    return this.rooms.joinRoom(user.id, dto.code);
  }

  @Get(':code')
  getByCode(@Param('code') code: string) {
    return this.rooms.getRoomByCode(code);
  }
}
