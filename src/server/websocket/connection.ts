import type { WebSocket } from 'ws';

export class Connection {
  ws: WebSocket;
  playerId: number | null;
  playerName: string | null;
  roomId: number | null;
  gameId: number | null;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.playerId = null;
    this.playerName = null;
    this.roomId = null;
    this.gameId = null;
  }

  send(message: string): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(message);
    }
  }

  sendError(type: string, errorText: string): void {
    const response = JSON.stringify({
      type,
      data: JSON.stringify({
        error: true,
        errorText,
      }),
      id: 0,
    });
    this.send(response);
  }

  setPlayer(playerId: number, playerName: string): void {
    this.playerId = playerId;
    this.playerName = playerName;
  }

  setRoom(roomId: number): void {
    this.roomId = roomId;
  }

  setGame(gameId: number): void {
    this.gameId = gameId;
  }

  clearRoom(): void {
    this.roomId = null;
  }

  clearGame(): void {
    this.gameId = null;
  }
}
