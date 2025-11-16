import type { Room } from '../models/room.js';
import type { GameRepository } from '../repositories/game-repository.js';
import type { RoomRepository } from '../repositories/room-repository.js';

export class RoomService {
  private roomRepository: RoomRepository;
  private gameRepository: GameRepository;

  constructor(roomRepository: RoomRepository, gameRepository: GameRepository) {
    this.roomRepository = roomRepository;
    this.gameRepository = gameRepository;
  }

  createRoom(playerId: number): Room {
    const room = this.roomRepository.create(playerId);
    return room;
  }

  joinRoom(roomId: number, playerId: number): Room {
    const room = this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.isFull()) {
      throw new Error('Room is full');
    }

    room.addPlayer(playerId);

    if (room.isFull()) {
      const game = this.gameRepository.create(roomId, room.players);
      room.setGameId(game.id);
    }

    return room;
  }

  getAvailableRooms(): Room[] {
    return this.roomRepository.findAvailable();
  }

  removeRoom(roomId: number): void {
    this.roomRepository.remove(roomId);
  }
}
