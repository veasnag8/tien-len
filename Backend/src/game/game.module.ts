import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module';
import { GameService } from './game.service';

@Module({
  imports: [RoomsModule],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
