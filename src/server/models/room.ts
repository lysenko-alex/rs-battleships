export class Room {
  id: number;
  players: number[];
  gameId: number | null;

  constructor(id: number, playerId: number) {
    this.id = id;
    this.players = [playerId];
    this.gameId = null;
  }

  addPlayer(playerId: number): void {
    if (this.isFull()) {
      throw new Error('Room is full');
    }
    if (this.players.includes(playerId)) {
      throw new Error('Player already in room');
    }
    this.players.push(playerId);
  }

  isFull(): boolean {
    return this.players.length >= 2;
  }

  getAvailablePlayer(): number | null {
    if (this.players.length === 1) {
      return this.players[0];
    }
    return null;
  }

  setGameId(gameId: number): void {
    this.gameId = gameId;
  }
}
