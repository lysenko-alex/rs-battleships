import crypto from 'node:crypto';

export class Player {
  id: number;
  name: string;
  passwordHash: string;
  wins: number;

  constructor(id: number, name: string, password: string, wins = 0) {
    this.id = id;
    this.name = name;
    this.passwordHash = this.hashPassword(password);
    this.wins = wins;
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  validatePassword(password: string): boolean {
    const hash = this.hashPassword(password);
    return hash === this.passwordHash;
  }

  incrementWins(): void {
    this.wins++;
  }

  toJSON(): { name: string; wins: number } {
    return {
      name: this.name,
      wins: this.wins,
    };
  }
}
