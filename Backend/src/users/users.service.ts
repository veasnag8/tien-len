import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { UpdateProfileDto } from '../auth/dto/auth.dto';
import type { GameHistoryEntry, UserProfile } from '@tien-len/shared';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const profile = this.auth.toProfile(user);
    const rank = await this.prisma.user.count({
      where: { points: { gt: user.points } },
    });
    profile.currentRank = rank + 1;
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: dto.nickname?.trim(),
        country: dto.country?.toUpperCase(),
        avatarUrl: dto.avatarUrl,
      },
    });
    return this.auth.toProfile(user);
  }

  async getHistory(userId: string, limit = 20): Promise<GameHistoryEntry[]> {
    const results = await this.prisma.gameResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { game: true },
    });

    return results.map((r) => ({
      id: r.id,
      roomId: r.game.roomId,
      placement: r.placement,
      playerCount: r.playerCount,
      playedAt: r.createdAt.toISOString(),
      points: r.points,
    }));
  }
}
