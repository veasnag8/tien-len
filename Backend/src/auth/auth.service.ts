import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { isLiteMode } from '../config/lite';
import { PrismaService } from '../prisma/prisma.service';
import { GuestLoginDto, LoginDto, RegisterDto } from './dto/auth.dto';
import type { UserProfile } from '@tien-len/shared';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  nickname: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  toProfile(user: User): UserProfile {
    const winRate = user.gamesPlayed === 0 ? 0 : Math.round((user.wins / user.gamesPlayed) * 1000) / 10;
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      country: user.country,
      provider: user.provider,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      winRate,
      points: user.points,
      currentRank: null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async register(dto: RegisterDto): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new UnauthorizedException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        nickname: dto.nickname.trim(),
        country: (dto.country ?? 'KH').toUpperCase(),
        provider: AuthProvider.email,
      },
    });

    const tokens = await this.issueTokens(user);
    return { user: this.toProfile(user), tokens };
  }

  async login(dto: LoginDto): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user);
    return { user: this.toProfile(user), tokens };
  }

  async guestLogin(dto: GuestLoginDto): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const guestId = randomBytes(8).toString('hex');
    const nickname = dto.nickname?.trim() || `Guest_${guestId.slice(0, 6)}`;
    const user = await this.prisma.user.create({
      data: {
        nickname,
        country: (dto.country ?? 'KH').toUpperCase(),
        provider: AuthProvider.guest,
        providerId: guestId,
        isGuest: true,
      },
    });
    const tokens = await this.issueTokens(user);
    return { user: this.toProfile(user), tokens };
  }

  async oauthLogin(
    provider: AuthProvider,
    providerId: string,
    email: string | null,
    nickname: string,
    avatarUrl: string | null,
  ): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    let user = await this.prisma.user.findFirst({
      where: { provider, providerId },
    });

    if (!user && email) {
      user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { provider, providerId, avatarUrl: avatarUrl ?? user.avatarUrl },
        });
      }
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: email?.toLowerCase() ?? null,
          nickname,
          avatarUrl,
          provider,
          providerId,
          country: 'KH',
        },
      });
    }

    const tokens = await this.issueTokens(user);
    return { user: this.toProfile(user), tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(stored.user);
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: user.id, nickname: user.nickname };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: isLiteMode() ? '7d' : '15m',
    });

    if (isLiteMode()) {
      return { accessToken, refreshToken: '' };
    }

    const refreshToken = randomBytes(48).toString('hex');
    const days = Number(this.config.get<string>('REFRESH_TOKEN_DAYS', '30'));
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
