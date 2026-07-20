import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoomStatus } from '@prisma/client';
import * as QRCode from 'qrcode';
import {
  GAME_CONSTANTS,
  generateRoomCode,
  type RoomInfo,
  type RoomSettings,
} from '@tien-len/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private inviteUrl(code: string): string {
    const base = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return `${base.replace(/\/$/, '')}/room/${code}`;
  }

  async createRoom(
    hostId: string,
    settings: Partial<RoomSettings> = {},
  ): Promise<{ room: RoomInfo; qrDataUrl: string }> {
    const maxPlayers = (settings.maxPlayers ?? 4) as 2 | 3 | 4;
    if (maxPlayers < 2 || maxPlayers > 4) {
      throw new BadRequestException('maxPlayers must be 2, 3, or 4');
    }

    let code = generateRoomCode(GAME_CONSTANTS.ROOM_CODE_LENGTH);
    for (let i = 0; i < 5; i += 1) {
      const exists = await this.prisma.room.findUnique({ where: { code } });
      if (!exists) {
        break;
      }
      code = generateRoomCode(GAME_CONSTANTS.ROOM_CODE_LENGTH);
    }

    const room = await this.prisma.room.create({
      data: {
        code,
        hostId,
        maxPlayers,
        allowFiveConsecutivePairs: settings.allowFiveConsecutivePairs ?? true,
        turnTimeoutMs: settings.turnTimeoutMs ?? GAME_CONSTANTS.TURN_TIMEOUT_MS,
        isPrivate: settings.isPrivate ?? false,
        players: {
          create: {
            userId: hostId,
            seatIndex: 0,
            isReady: false,
            isConnected: true,
          },
        },
      },
      include: {
        players: { include: { user: true }, orderBy: { seatIndex: 'asc' } },
      },
    });

    const info = this.toRoomInfo(room);
    const qrDataUrl = await QRCode.toDataURL(info.inviteUrl, {
      margin: 1,
      width: 512,
      color: { dark: '#0f3d2e', light: '#ffffff' },
    });

    await this.redis.setJson(`room:${room.id}`, info, 60 * 60 * 6);
    return { room: info, qrDataUrl };
  }

  async joinRoom(userId: string, code: string): Promise<RoomInfo> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        players: { include: { user: true }, orderBy: { seatIndex: 'asc' } },
      },
    });

    if (!room || room.status === RoomStatus.closed) {
      throw new NotFoundException('Room not found');
    }
    if (room.status === RoomStatus.playing) {
      const existing = room.players.find((p) => p.userId === userId);
      if (!existing) {
        throw new BadRequestException('Game already in progress');
      }
      await this.prisma.roomPlayer.update({
        where: { id: existing.id },
        data: { isConnected: true },
      });
      return this.getRoomInfo(room.id);
    }

    const already = room.players.find((p) => p.userId === userId);
    if (already) {
      await this.prisma.roomPlayer.update({
        where: { id: already.id },
        data: { isConnected: true },
      });
      return this.getRoomInfo(room.id);
    }

    if (room.players.length >= room.maxPlayers) {
      throw new BadRequestException('Room is full');
    }

    const usedSeats = new Set(room.players.map((p) => p.seatIndex));
    let seatIndex = 0;
    while (usedSeats.has(seatIndex)) {
      seatIndex += 1;
    }

    await this.prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        userId,
        seatIndex,
        isReady: false,
        isConnected: true,
      },
    });

    return this.getRoomInfo(room.id);
  }

  async leaveRoom(userId: string, roomId: string): Promise<RoomInfo | null> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true },
    });
    if (!room) {
      return null;
    }

    await this.prisma.roomPlayer.deleteMany({ where: { roomId, userId } });

    const remaining = room.players.filter((p) => p.userId !== userId);
    if (remaining.length === 0) {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.closed },
      });
      await this.redis.del(`room:${roomId}`);
      return null;
    }

    if (room.hostId === userId) {
      const newHost = remaining[0]!;
      await this.prisma.room.update({
        where: { id: roomId },
        data: { hostId: newHost.userId },
      });
    }

    return this.getRoomInfo(roomId);
  }

  async setReady(userId: string, roomId: string, ready: boolean): Promise<RoomInfo> {
    await this.prisma.roomPlayer.updateMany({
      where: { roomId, userId },
      data: { isReady: ready },
    });
    return this.getRoomInfo(roomId);
  }

  async kickPlayer(hostId: string, roomId: string, targetUserId: string): Promise<RoomInfo> {
    const room = await this.requireHost(hostId, roomId);
    if (targetUserId === hostId) {
      throw new BadRequestException('Cannot kick yourself');
    }
    if (room.status === RoomStatus.playing) {
      throw new BadRequestException('Cannot kick during game');
    }
    await this.prisma.roomPlayer.deleteMany({
      where: { roomId, userId: targetUserId },
    });
    return this.getRoomInfo(roomId);
  }

  async transferHost(hostId: string, roomId: string, targetUserId: string): Promise<RoomInfo> {
    await this.requireHost(hostId, roomId);
    const target = await this.prisma.roomPlayer.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });
    if (!target) {
      throw new NotFoundException('Target player not in room');
    }
    await this.prisma.room.update({
      where: { id: roomId },
      data: { hostId: targetUserId },
    });
    return this.getRoomInfo(roomId);
  }

  async closeRoom(hostId: string, roomId: string): Promise<void> {
    await this.requireHost(hostId, roomId);
    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.closed },
    });
    await this.prisma.roomPlayer.deleteMany({ where: { roomId } });
    await this.redis.del(`room:${roomId}`);
    await this.redis.del(`game:${roomId}`);
  }

  async getRoomInfo(roomId: string): Promise<RoomInfo> {
    await this.recoverIfStale(roomId);
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        players: { include: { user: true }, orderBy: { seatIndex: 'asc' } },
      },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    const info = this.toRoomInfo(room);
    await this.redis.setJson(`room:${roomId}`, info, 60 * 60 * 6);
    return info;
  }

  /** Reset lobby when DB says playing/finished but Redis game state is gone. */
  async recoverIfStale(roomId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (
      !room ||
      (room.status !== RoomStatus.playing && room.status !== RoomStatus.finished)
    ) {
      return;
    }
    const hasGame = await this.redis.get(`game:${roomId}`);
    if (hasGame) {
      return;
    }
    await this.redis.del(`game:${roomId}`);
    await this.prisma.roomPlayer.updateMany({
      where: { roomId },
      data: { isReady: false },
    });
    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.waiting },
    });
  }

  async getRoomByCode(code: string): Promise<RoomInfo> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return this.getRoomInfo(room.id);
  }

  async setStatus(roomId: string, status: RoomStatus): Promise<void> {
    await this.prisma.room.update({ where: { id: roomId }, data: { status } });
  }

  async setConnected(roomId: string, userId: string, connected: boolean): Promise<RoomInfo> {
    await this.prisma.roomPlayer.updateMany({
      where: { roomId, userId },
      data: { isConnected: connected },
    });
    return this.getRoomInfo(roomId);
  }

  async resetReady(roomId: string): Promise<RoomInfo> {
    await this.prisma.roomPlayer.updateMany({
      where: { roomId },
      data: { isReady: false },
    });
    await this.setStatus(roomId, RoomStatus.waiting);
    return this.getRoomInfo(roomId);
  }

  private async requireHost(hostId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (room.hostId !== hostId) {
      throw new ForbiddenException('Only host can perform this action');
    }
    return room;
  }

  private toRoomInfo(room: {
    id: string;
    code: string;
    status: RoomStatus;
    hostId: string;
    maxPlayers: number;
    allowFiveConsecutivePairs: boolean;
    turnTimeoutMs: number;
    isPrivate: boolean;
    createdAt: Date;
    players: Array<{
      userId: string;
      seatIndex: number;
      isReady: boolean;
      isConnected: boolean;
      user: {
        nickname: string;
        avatarUrl: string | null;
        country: string;
      };
    }>;
  }): RoomInfo {
    return {
      id: room.id,
      code: room.code,
      inviteUrl: this.inviteUrl(room.code),
      status: room.status,
      hostId: room.hostId,
      players: room.players.map((p) => ({
        userId: p.userId,
        nickname: p.user.nickname,
        avatarUrl: p.user.avatarUrl,
        country: p.user.country,
        isHost: p.userId === room.hostId,
        isReady: p.isReady,
        isConnected: p.isConnected,
        seatIndex: p.seatIndex,
      })),
      settings: {
        maxPlayers: room.maxPlayers as 2 | 3 | 4,
        allowFiveConsecutivePairs: room.allowFiveConsecutivePairs,
        turnTimeoutMs: room.turnTimeoutMs,
        isPrivate: room.isPrivate,
      },
      createdAt: room.createdAt.toISOString(),
    };
  }
}
