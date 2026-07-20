import { Controller, Get, Query } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import type { LeaderboardPeriod } from '@tien-len/shared';
import { LeaderboardService } from './leaderboard.service';

class LeaderboardQueryDto {
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'all_time'])
  period?: LeaderboardPeriod;
}

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get()
  get(@Query() query: LeaderboardQueryDto) {
    return this.leaderboard.getLeaderboard(query.period ?? 'all_time');
  }
}
