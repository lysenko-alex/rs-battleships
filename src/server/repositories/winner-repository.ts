import type { Winner } from '../types/index.js';
import type { PlayerRepository } from './player-repository.js';

export class WinnerRepository {
  private playerRepository: PlayerRepository;

  constructor(playerRepository: PlayerRepository) {
    this.playerRepository = playerRepository;
  }

  getWinners(): Winner[] {
    const players = this.playerRepository.getAll();
    return players
      .filter((player) => player.wins > 0)
      .sort((a, b) => b.wins - a.wins)
      .map((player) => ({
        name: player.name,
        wins: player.wins,
      }));
  }

  updateWinner(playerId: number): void {
    const player = this.playerRepository.findById(playerId);
    if (player) {
      player.incrementWins();
      this.playerRepository.update(player);
    }
  }
}
