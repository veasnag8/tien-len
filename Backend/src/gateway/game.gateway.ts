import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  GAME_CONSTANTS,
  type Card,
} from '@tien-len/shared';
import {
  SocketEvents,
  type AuthIdentifyPayload,
  type ChatSendPayload,
  type GamePassPayload,
  type GamePlayPayload,
  type RoomCreatePayload,
  type RoomJoinPayload,
  type RoomKickPayload,
  type RoomReadyPayload,
  type RoomTransferHostPayload,
} from '@tien-len/socket';
import { AuthService } from '../auth/auth.service';
import { RoomsService } from '../rooms/rooms.service';
import { GameService } from '../game/game.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface SocketData {
  userId?: string;
  roomId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly turnTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
    private readonly rooms: RoomsService,
    private readonly game: GameService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.headers.authorization?.replace('Bearer ', '') ?? '');
      if (!token) {
        return;
      }
      await this.identify(client, token);
    } catch {
      client.emit(SocketEvents.ROOM_ERROR, {
        code: 'AUTH_FAILED',
        message: 'Authentication failed',
      });
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const data = client.data as SocketData;
    if (!data.userId || !data.roomId) {
      return;
    }
    const room = await this.rooms.setConnected(data.roomId, data.userId, false);
    this.server.to(data.roomId).emit(SocketEvents.PLAYER_DISCONNECTED, {
      userId: data.userId,
    });
    this.server.to(data.roomId).emit(SocketEvents.ROOM_UPDATE, { room });
  }

  @SubscribeMessage(SocketEvents.AUTH_IDENTIFY)
  async onIdentify(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AuthIdentifyPayload,
  ): Promise<void> {
    await this.identify(client, payload.token);
  }

  @SubscribeMessage(SocketEvents.ROOM_CREATE)
  async onCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomCreatePayload,
  ): Promise<void> {
    const userId = this.requireUser(client);
    const { room, qrDataUrl } = await this.rooms.createRoom(userId, payload.settings ?? {});
    await this.joinSocketRoom(client, room.id);
    client.emit(SocketEvents.ROOM_CREATED, { room, qrDataUrl });
    client.emit(SocketEvents.ROOM_UPDATE, { room });
  }

  @SubscribeMessage(SocketEvents.ROOM_JOIN)
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomJoinPayload,
  ): Promise<void> {
    try {
      const userId = this.requireUser(client);
      const room = await this.rooms.joinRoom(userId, payload.code);
      await this.joinSocketRoom(client, room.id);
      client.emit(SocketEvents.ROOM_JOINED, { room });
      this.server.to(room.id).emit(SocketEvents.ROOM_UPDATE, { room });

      const privateState = await this.game.getPrivateState(room.id, userId);
      if (privateState) {
        client.emit(SocketEvents.GAME_PRIVATE_STATE, { state: privateState });
        client.emit(SocketEvents.GAME_STATE, { state: privateState });
      }
    } catch (error) {
      client.emit(SocketEvents.ROOM_ERROR, {
        code: 'JOIN_FAILED',
        message: error instanceof Error ? error.message : 'Join failed',
      });
    }
  }

  @SubscribeMessage(SocketEvents.ROOM_LEAVE)
  async onLeave(@ConnectedSocket() client: Socket): Promise<void> {
    const data = client.data as SocketData;
    if (!data.userId || !data.roomId) {
      return;
    }
    const roomId = data.roomId;
    const room = await this.rooms.leaveRoom(data.userId, roomId);
    client.leave(roomId);
    data.roomId = undefined;
    client.emit(SocketEvents.ROOM_LEFT, { roomId });
    if (room) {
      this.server.to(roomId).emit(SocketEvents.ROOM_UPDATE, { room });
    }
  }

  @SubscribeMessage(SocketEvents.ROOM_READY)
  async onReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomReadyPayload,
  ): Promise<void> {
    const data = client.data as SocketData;
    if (!data.userId || !data.roomId) {
      return;
    }
    const room = await this.rooms.setReady(data.userId, data.roomId, payload.ready);
    this.server.to(data.roomId).emit(SocketEvents.ROOM_UPDATE, { room });
  }

  @SubscribeMessage(SocketEvents.ROOM_START)
  async onStart(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const data = client.data as SocketData;
      if (!data.userId || !data.roomId) {
        return;
      }
      const snap = await this.game.startGame(data.roomId, data.userId);
      this.broadcastGame(data.roomId, snap);
      this.scheduleTurnTimer(data.roomId, snap.publicState.turnDeadline);
      const room = await this.rooms.getRoomInfo(data.roomId);
      this.server.to(data.roomId).emit(SocketEvents.ROOM_UPDATE, { room });
    } catch (error) {
      client.emit(SocketEvents.GAME_ERROR, {
        code: 'START_FAILED',
        message: error instanceof Error ? error.message : 'Start failed',
      });
    }
  }

  @SubscribeMessage(SocketEvents.ROOM_KICK)
  async onKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomKickPayload,
  ): Promise<void> {
    const data = client.data as SocketData;
    if (!data.userId || !data.roomId) {
      return;
    }
    const room = await this.rooms.kickPlayer(data.userId, data.roomId, payload.userId);
    this.server.to(data.roomId).emit(SocketEvents.ROOM_UPDATE, { room });
    this.server.to(data.roomId).emit(SocketEvents.ROOM_LEFT, { roomId: data.roomId });
  }

  @SubscribeMessage(SocketEvents.ROOM_TRANSFER_HOST)
  async onTransfer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomTransferHostPayload,
  ): Promise<void> {
    const data = client.data as SocketData;
    if (!data.userId || !data.roomId) {
      return;
    }
    const room = await this.rooms.transferHost(data.userId, data.roomId, payload.userId);
    this.server.to(data.roomId).emit(SocketEvents.ROOM_UPDATE, { room });
  }

  @SubscribeMessage(SocketEvents.ROOM_CLOSE)
  async onClose(@ConnectedSocket() client: Socket): Promise<void> {
    const data = client.data as SocketData;
    if (!data.userId || !data.roomId) {
      return;
    }
    const roomId = data.roomId;
    this.clearTurnTimer(roomId);
    await this.game.clearGame(roomId);
    await this.rooms.closeRoom(data.userId, roomId);
    this.server.to(roomId).emit(SocketEvents.ROOM_LEFT, { roomId });
    this.server.in(roomId).socketsLeave(roomId);
  }

  @SubscribeMessage(SocketEvents.ROOM_RESTART)
  @SubscribeMessage(SocketEvents.ROOM_PLAY_AGAIN)
  async onRestart(@ConnectedSocket() client: Socket): Promise<void> {
    const data = client.data as SocketData;
    if (!data.userId || !data.roomId) {
      return;
    }
    this.clearTurnTimer(data.roomId);
    await this.game.clearGame(data.roomId);
    const room = await this.rooms.resetReady(data.roomId);
    this.server.to(data.roomId).emit(SocketEvents.ROOM_UPDATE, { room });
  }

  @SubscribeMessage(SocketEvents.GAME_PLAY)
  async onPlay(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GamePlayPayload,
  ): Promise<void> {
    try {
      const data = client.data as SocketData;
      if (!data.userId || !data.roomId) {
        return;
      }
      if (!(await this.rateLimit(data.userId))) {
        client.emit(SocketEvents.GAME_ERROR, {
          code: 'RATE_LIMIT',
          message: 'Too many requests',
        });
        return;
      }
      const snap = await this.game.play(
        data.roomId,
        data.userId,
        payload.cards as Card[],
        payload.requestId,
      );
      this.broadcastGame(data.roomId, snap);
      this.scheduleTurnTimer(data.roomId, snap.publicState.turnDeadline);
      if (snap.publicState.phase === 'finished') {
        this.server.to(data.roomId).emit(SocketEvents.GAME_FINISHED, {
          rankings: snap.publicState.rankings,
          state: snap.publicState,
        });
      }
    } catch (error) {
      client.emit(SocketEvents.GAME_ERROR, {
        code: 'PLAY_FAILED',
        message: error instanceof Error ? error.message : 'Play failed',
      });
    }
  }

  @SubscribeMessage(SocketEvents.GAME_PASS)
  async onPass(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GamePassPayload,
  ): Promise<void> {
    try {
      const data = client.data as SocketData;
      if (!data.userId || !data.roomId) {
        return;
      }
      if (!(await this.rateLimit(data.userId))) {
        client.emit(SocketEvents.GAME_ERROR, {
          code: 'RATE_LIMIT',
          message: 'Too many requests',
        });
        return;
      }
      const snap = await this.game.pass(data.roomId, data.userId, payload.requestId);
      this.broadcastGame(data.roomId, snap);
      this.scheduleTurnTimer(data.roomId, snap.publicState.turnDeadline);
    } catch (error) {
      client.emit(SocketEvents.GAME_ERROR, {
        code: 'PASS_FAILED',
        message: error instanceof Error ? error.message : 'Pass failed',
      });
    }
  }

  @SubscribeMessage(SocketEvents.CHAT_SEND)
  async onChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatSendPayload,
  ): Promise<void> {
    const data = client.data as SocketData;
    if (!data.userId || !data.roomId) {
      return;
    }
    const content = payload.content.trim().slice(0, GAME_CONSTANTS.MAX_CHAT_LENGTH);
    if (!content) {
      return;
    }
    const user = await this.auth.validateUser(data.userId);
    if (!user) {
      return;
    }
    const message = await this.prisma.chatMessage.create({
      data: {
        roomId: data.roomId,
        userId: data.userId,
        content,
        isEmoji: Boolean(payload.isEmoji),
      },
    });
    this.server.to(data.roomId).emit(SocketEvents.CHAT_MESSAGE, {
      message: {
        id: message.id,
        roomId: message.roomId,
        userId: message.userId,
        nickname: user.nickname,
        content: message.content,
        isEmoji: message.isEmoji,
        createdAt: message.createdAt.toISOString(),
      },
    });
  }

  @SubscribeMessage(SocketEvents.PLAYER_RECONNECT)
  async onReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ): Promise<void> {
    const userId = this.requireUser(client);
    const room = await this.rooms.joinRoom(userId, payload.roomCode);
    await this.joinSocketRoom(client, room.id);
    this.server.to(room.id).emit(SocketEvents.PLAYER_RECONNECTED, { userId });
    this.server.to(room.id).emit(SocketEvents.ROOM_UPDATE, { room });
    const privateState = await this.game.getPrivateState(room.id, userId);
    if (privateState) {
      client.emit(SocketEvents.GAME_PRIVATE_STATE, { state: privateState });
    }
    client.emit(SocketEvents.PLAYER_RECONNECTED, { userId });
  }

  private async identify(client: Socket, token: string): Promise<void> {
    const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
      secret: this.config.get<string>('JWT_SECRET', 'change-me'),
    });
    const user = await this.auth.validateUser(payload.sub);
    if (!user) {
      throw new Error('User not found');
    }
    (client.data as SocketData).userId = user.id;
    client.emit(SocketEvents.AUTH_IDENTIFIED, { user: this.auth.toProfile(user) });
  }

  private requireUser(client: Socket): string {
    const userId = (client.data as SocketData).userId;
    if (!userId) {
      throw new Error('Not authenticated');
    }
    return userId;
  }

  private async joinSocketRoom(client: Socket, roomId: string): Promise<void> {
    const data = client.data as SocketData;
    if (data.roomId) {
      client.leave(data.roomId);
    }
    data.roomId = roomId;
    await client.join(roomId);
  }

  private broadcastGame(
    roomId: string,
    snap: {
      publicState: import('@tien-len/shared').PublicGameState;
      privateStates: Map<string, import('@tien-len/shared').PrivateGameState>;
    },
  ): void {
    this.server.to(roomId).emit(SocketEvents.GAME_STATE, { state: snap.publicState });
    for (const [userId, state] of snap.privateStates) {
      for (const [, socket] of this.server.sockets.sockets) {
        if ((socket.data as SocketData).userId === userId) {
          socket.emit(SocketEvents.GAME_PRIVATE_STATE, { state });
        }
      }
    }
  }

  private scheduleTurnTimer(roomId: string, deadline: number | null): void {
    this.clearTurnTimer(roomId);
    if (!deadline) {
      return;
    }
    const delay = Math.max(0, deadline - Date.now());
    const timer = setTimeout(() => {
      void this.onTurnTimeout(roomId);
    }, delay + 50);
    this.turnTimers.set(roomId, timer);
  }

  private clearTurnTimer(roomId: string): void {
    const existing = this.turnTimers.get(roomId);
    if (existing) {
      clearTimeout(existing);
      this.turnTimers.delete(roomId);
    }
  }

  private async onTurnTimeout(roomId: string): Promise<void> {
    const result = await this.game.handleTimeout(roomId);
    if (!result) {
      return;
    }
    this.server.to(roomId).emit(SocketEvents.GAME_TIMEOUT, {
      userId: result.timedOutUserId,
    });
    this.broadcastGame(roomId, result);
    this.scheduleTurnTimer(roomId, result.publicState.turnDeadline);
    if (result.publicState.phase === 'finished') {
      this.server.to(roomId).emit(SocketEvents.GAME_FINISHED, {
        rankings: result.publicState.rankings,
        state: result.publicState,
      });
    }
  }

  private async rateLimit(userId: string): Promise<boolean> {
    const key = `rl:${userId}`;
    const count = await this.redis.getClient().incr(key);
    if (count === 1) {
      await this.redis.getClient().pexpire(key, GAME_CONSTANTS.RATE_LIMIT_WINDOW_MS);
    }
    return count <= GAME_CONSTANTS.RATE_LIMIT_MAX_REQUESTS;
  }
}

export function createRequestId(): string {
  return uuidv4();
}
