import { Injectable } from '@nestjs/common';
import type { LeaderboardEntry, LeaderboardPeriod } from '@tien-len/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(
    period: LeaderboardPeriod,
    limit = 50,
  ): Promise<LeaderboardEntry[]> {
    const since = this.periodStart(period);

    if (period === 'all_time') {
      const users = await this.prisma.user.findMany({
        where: { isGuest: false },
        orderBy: [{ points: 'desc' }, { wins: 'desc' }],
        take: limit,
      });
      return users.map((u, index) => ({
        userId: u.id,
        nickname: u.nickname,
        avatarUrl: u.avatarUrl,
        country: u.country,
        wins: u.wins,
        gamesPlayed: u.gamesPlayed,
        winRate: u.gamesPlayed === 0 ? 0 : Math.round((u.wins / u.gamesPlayed) * 1000) / 10,
        points: u.points,
        rank: index + 1,
      }));
    }

    const results = await this.prisma.gameResult.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { points: true },
      _count: { _all: true },
      orderBy: { _sum: { points: 'desc' } },
      take: limit,
    });

    const userIds = results.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const winsMap = new Map<string, number>();
    const winRows = await this.prisma.gameResult.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        createdAt: { gte: since },
        placement: 1,
      },
      _count: { _all: true },
    });
    for (const row of winRows) {
      winsMap.set(row.userId, row._count._all);
    }

    return results.map((r, index) => {
      const user = userMap.get(r.userId)!;
      const gamesPlayed = r._count._all;
      const wins = winsMap.get(r.userId) ?? 0;
      return {
        userId: r.userId,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        country: user.country,
        wins,
        gamesPlayed,
        winRate: gamesPlayed === 0 ? 0 : Math.round((wins / gamesPlayed) * 1000) / 10,
        points: r._sum.points ?? 0,
        rank: index + 1,
      };
    });
  }

  private periodStart(period: LeaderboardPeriod): Date {
    const now = new Date();
    if (period === 'daily') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    if (period === 'weekly') {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    }
    if (period === 'monthly') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return new Date(0);
  }
}
