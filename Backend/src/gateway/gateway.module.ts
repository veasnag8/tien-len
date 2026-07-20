import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';
import { GameModule } from '../game/game.module';
import { GameGateway } from './game.gateway';

@Module({
  imports: [AuthModule, RoomsModule, GameModule],
  providers: [GameGateway],
})
export class GatewayModule {}
