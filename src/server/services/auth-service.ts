import type { Player } from '../models/player.js';
import type { PlayerRepository } from '../repositories/player-repository.js';

interface AuthResult {
  player: Player;
  isNew: boolean;
}

export class AuthService {
  private playerRepository: PlayerRepository;

  constructor(playerRepository: PlayerRepository) {
    this.playerRepository = playerRepository;
  }

  register(name: string, password: string): AuthResult {
    const existing = this.playerRepository.findByName(name);

    if (existing) {
      if (!existing.validatePassword(password)) {
        throw new Error('Invalid password');
      }
      return { player: existing, isNew: false };
    }
    const player = this.playerRepository.create(name, password);
    return { player, isNew: true };
  }

  validateCredentials(name: string, password: string): Player | null {
    const player = this.playerRepository.findByName(name);
    if (!player) {
      return null;
    }
    return player.validatePassword(password) ? player : null;
  }
}
