import { Injectable } from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import {
  autoPassOnTimeout,
  createGame,
  forfeitPlayer,
  passTurn,
  playCards,
  toPrivateState,
  toPublicState,
  type Card,
  type InternalGameState,
  type PrivateGameState,
  type PublicGameState,
} from '@tien-len/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RoomsService } from '../rooms/rooms.service';
import { isLiteMode } from '../config/lite';

const POINTS_BY_PLACEMENT: Record<number, number[]> = {
  2: [10, 0],
  3: [15, 8, 0],
  4: [20, 12, 6, 0],
};

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly rooms: RoomsService,
  ) {}

  private gameKey(roomId: string): string {
    return `game:${roomId}`;
  }

  private lastWinnerKey(roomId: string): string {
    return `game:${roomId}:lastWinner`;
  }

  private requestKey(requestId: string): string {
    return `req:${requestId}`;
  }

  async startGame(roomId: string, hostId: string): Promise<{
    publicState: PublicGameState;
    privateStates: Map<string, PrivateGameState>;
  }> {
    const room = await this.rooms.getRoomInfo(roomId);
    if (room.hostId !== hostId) {
      throw new Error('Only host can start the game');
    }
    if (room.players.length < 2) {
      throw new Error('Need at least 2 players');
    }
    if (room.players.some((p) => !p.isReady && p.userId !== hostId)) {
      throw new Error('All players must be ready');
    }

    const ordered = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
    const lastWinner = await this.redis.get(this.lastWinnerKey(roomId));
    const state = createGame(
      roomId,
      ordered.map((p) => p.userId),
      room.settings.allowFiveConsecutivePairs,
      Math.random,
      room.settings.turnTimeoutMs ?? 30_000,
      lastWinner,
    );

    await this.saveState(state);
    await this.rooms.setStatus(
      roomId,
      state.phase === 'finished' ? RoomStatus.finished : RoomStatus.playing,
    );

    if (!isLiteMode()) {
      await this.prisma.game.create({
        data: {
          roomId,
          roundNumber: state.roundNumber,
          stateJson: toPublicState(state) as object,
        },
      });
    }

    if (state.phase === 'finished') {
      await this.finalizeGame(state);
    }

    return this.snapshot(state);
  }

  async play(
    roomId: string,
    userId: string,
    cards: Card[],
    requestId: string,
  ): Promise<{ publicState: PublicGameState; privateStates: Map<string, PrivateGameState> }> {
    await this.ensureUniqueRequest(requestId);
    const state = await this.loadState(roomId);
    const result = playCards(state, userId, cards);
    if (!result.ok) {
      throw new Error(result.error);
    }
    await this.saveState(result.state);
    if (result.state.phase === 'finished') {
      await this.finalizeGame(result.state);
    }
    return this.snapshot(result.state);
  }

  async pass(
    roomId: string,
    userId: string,
    requestId: string,
  ): Promise<{ publicState: PublicGameState; privateStates: Map<string, PrivateGameState> }> {
    await this.ensureUniqueRequest(requestId);
    const state = await this.loadState(roomId);
    const result = passTurn(state, userId);
    if (!result.ok) {
      throw new Error(result.error);
    }
    await this.saveState(result.state);
    return this.snapshot(result.state);
  }

  async handleTimeout(roomId: string): Promise<{
    publicState: PublicGameState;
    privateStates: Map<string, PrivateGameState>;
    timedOutUserId: string;
  } | null> {
    const state = await this.loadState(roomId);
    if (!state.turnTimeoutMs) {
      state.turnTimeoutMs = 30_000;
    }
    if (!state.turnDeadline || Date.now() + 400 < state.turnDeadline) {
      return null;
    }
    const timedOutUserId = state.players[state.currentTurnSeat]?.userId;
    if (!timedOutUserId) {
      return null;
    }
    const result = autoPassOnTimeout(state);
    if (!result.ok) {
      return null;
    }
    await this.saveState(result.state);
    if (result.state.phase === 'finished') {
      await this.finalizeGame(result.state);
    }
    const snap = this.snapshot(result.state);
    return { ...snap, timedOutUserId };
  }

  async getPrivateState(roomId: string, userId: string): Promise<PrivateGameState | null> {
    const raw = await this.redis.get(this.gameKey(roomId));
    if (!raw) {
      return null;
    }
    const state = this.deserialize(raw);
    return toPrivateState(state, userId);
  }

  async clearGame(roomId: string): Promise<void> {
    await this.redis.del(this.gameKey(roomId));
  }

  async clearSession(roomId: string): Promise<void> {
    await this.redis.del(this.gameKey(roomId));
    await this.redis.del(this.lastWinnerKey(roomId));
  }

  /** Mid-game leave with 2+ players still in room — forfeit leaver, others continue. */
  async forfeitOnLeave(roomId: string, userId: string): Promise<{
    publicState: PublicGameState;
    privateStates: Map<string, PrivateGameState>;
  } | null> {
    const raw = await this.redis.get(this.gameKey(roomId));
    if (!raw) {
      return null;
    }
    const state = this.deserialize(raw);
    const changed = forfeitPlayer(state, userId);
    if (!changed) {
      return null;
    }
    await this.saveState(state);
    if (state.phase === 'finished') {
      await this.finalizeGame(state);
    }
    return this.snapshot(state);
  }

  private async finalizeGame(state: InternalGameState): Promise<void> {
    await this.rooms.setStatus(state.roomId, RoomStatus.finished);
    const winnerId = state.rankings[0];
    if (winnerId) {
      await this.redis.set(this.lastWinnerKey(state.roomId), winnerId, 60 * 60 * 24);
    }
    if (isLiteMode()) {
      return;
    }
    const pointsTable = POINTS_BY_PLACEMENT[state.playerCount] ?? [0, 0, 0, 0];

    const game = await this.prisma.game.findFirst({
      where: { roomId: state.roomId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (game) {
      await this.prisma.game.update({
        where: { id: game.id },
        data: {
          endedAt: new Date(),
          stateJson: toPublicState(state) as object,
        },
      });

      for (let i = 0; i < state.rankings.length; i += 1) {
        const userId = state.rankings[i]!;
        const placement = i + 1;
        const points = pointsTable[i] ?? 0;
        await this.prisma.gameResult.create({
          data: {
            gameId: game.id,
            userId,
            placement,
            playerCount: state.playerCount,
            points,
          },
        });
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            gamesPlayed: { increment: 1 },
            wins: placement === 1 ? { increment: 1 } : undefined,
            points: { increment: points },
          },
        });
      }
    }
  }

  private snapshot(state: InternalGameState): {
    publicState: PublicGameState;
    privateStates: Map<string, PrivateGameState>;
  } {
    const privateStates = new Map<string, PrivateGameState>();
    for (const player of state.players) {
      privateStates.set(player.userId, toPrivateState(state, player.userId));
    }
    return { publicState: toPublicState(state), privateStates };
  }

  private async saveState(state: InternalGameState): Promise<void> {
    const serializable = {
      ...state,
      passedSeats: [...state.passedSeats],
    };
    await this.redis.setJson(this.gameKey(state.roomId), serializable, 60 * 60 * 6);
  }

  private async loadState(roomId: string): Promise<InternalGameState> {
    const raw = await this.redis.get(this.gameKey(roomId));
    if (!raw) {
      throw new Error('Game not found');
    }
    return this.deserialize(raw);
  }

  private deserialize(raw: string): InternalGameState {
    const parsed = JSON.parse(raw) as Omit<InternalGameState, 'passedSeats'> & {
      passedSeats: number[];
      turnTimeoutMs?: number;
    };
    return {
      ...parsed,
      turnTimeoutMs: parsed.turnTimeoutMs ?? 30_000,
      winReason: parsed.winReason ?? null,
      passedSeats: new Set(parsed.passedSeats),
    };
  }

  private async ensureUniqueRequest(requestId: string): Promise<void> {
    const acquired = await this.redis.acquireLock(this.requestKey(requestId), 10_000);
    if (!acquired) {
      throw new Error('Duplicate request');
    }
  }
}
