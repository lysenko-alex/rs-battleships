import { httpServer } from './http_server/index.js';
import * as Logger from './server/utils/logger.js';

import { GameRepository } from './server/repositories/game-repository.js';
import { PlayerRepository } from './server/repositories/player-repository.js';
import { RoomRepository } from './server/repositories/room-repository.js';
import { WinnerRepository } from './server/repositories/winner-repository.js';
import { AuthService } from './server/services/auth-service.js';
import { BattleshipService } from './server/services/battleship-service.js';
import { BotService } from './server/services/bot-service.js';
import { GameService } from './server/services/game-service.js';
import { RoomService } from './server/services/room-service.js';

import { GameHandler } from './server/handlers/game-handler.js';
import { PlayerHandler } from './server/handlers/player-handler.js';
import { RoomHandler } from './server/handlers/room-handler.js';
import { ShipHandler } from './server/handlers/ship-handler.js';
import { MessageHandler } from './server/websocket/message-handler.js';
import { WebSocketServerManager } from './server/websocket/server.js';

const HTTP_PORT = 8181;
const WS_PORT = 3000;

const playerRepository = new PlayerRepository();
const roomRepository = new RoomRepository();
const gameRepository = new GameRepository();
const winnerRepository = new WinnerRepository(playerRepository);

const authService = new AuthService(playerRepository);
const roomService = new RoomService(roomRepository, gameRepository);
const gameService = new GameService(gameRepository);
const battleshipService = new BattleshipService(gameRepository);
const botService = new BotService();

let wsServerManager: WebSocketServerManager | null = null;

const getConnections = (): ReturnType<WebSocketServerManager['getConnections']> => {
  return wsServerManager ? wsServerManager.getConnections() : [];
};

const broadcast = (message: string): void => {
  if (wsServerManager) {
    wsServerManager.broadcast(message);
  }
};

const playerHandler = new PlayerHandler(authService, winnerRepository, broadcast);
const roomHandler = new RoomHandler(roomService, playerRepository, getConnections, broadcast);
const gameHandler = new GameHandler(
  gameService,
  battleshipService,
  gameRepository,
  winnerRepository,
  botService,
  getConnections,
  broadcast
);
const shipHandler = new ShipHandler(
  gameService,
  battleshipService,
  gameRepository,
  gameHandler,
  getConnections
);

const messageHandler = new MessageHandler(playerHandler, roomHandler, shipHandler, gameHandler);

wsServerManager = new WebSocketServerManager(messageHandler, WS_PORT);
wsServerManager.start();

httpServer.listen(HTTP_PORT, () => {
  Logger.logInfo(`Start static http server on the ${HTTP_PORT} port!`);
  Logger.logInfo(`WebSocket server running on ws://localhost:${WS_PORT}`);
  Logger.logInfo(`HTTP server running on http://localhost:${HTTP_PORT}`);
  Logger.logInfo('\n=== Server Started ===');
  Logger.logInfo(`HTTP Server: http://localhost:${HTTP_PORT}`);
  Logger.logInfo(`WebSocket Server: ws://localhost:${WS_PORT}`);
  Logger.logInfo('====================\n');
});

const shutdown = async (): Promise<void> => {
  Logger.logInfo('Shutting down servers...');

  if (wsServerManager) {
    await wsServerManager.close();
  }

  httpServer.close(() => {
    Logger.logInfo('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
