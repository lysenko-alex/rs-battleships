import { GAME_STATUS } from '../constants/message-types.js';
import type { Game } from '../models/game.js';
import type { GameRepository } from '../repositories/game-repository.js';
import type { ShipData } from '../types/index.js';

export class GameService {
  private gameRepository: GameRepository;

  constructor(gameRepository: GameRepository) {
    this.gameRepository = gameRepository;
  }

  initializeGame(roomId: number, playerIds: number[]): Game {
    const existing = this.gameRepository.findByRoomId(roomId);
    if (existing) {
      return existing;
    }
    return this.gameRepository.create(roomId, playerIds);
  }

  addShips(gameId: number, playerId: number, ships: ShipData[]): void {
    const game = this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    game.setShips(playerId, ships);
    this.gameRepository.update(game);
  }

  startGameIfReady(gameId: number): boolean {
    const game = this.gameRepository.findById(gameId);
    if (!game) {
      return false;
    }

    if (game.isReady() && game.status === GAME_STATUS.WAITING) {
      game.start();
      this.gameRepository.update(game);
      return true;
    }

    return false;
  }

  getCurrentPlayer(gameId: number): number | null {
    const game = this.gameRepository.findById(gameId);
    if (!game) {
      return null;
    }
    return game.currentPlayerId;
  }

  switchTurn(gameId: number): void {
    const game = this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    game.switchTurn();
    this.gameRepository.update(game);
  }
}
