import { MESSAGE_TYPES } from '../constants/message-types.js';
import type { GameRepository } from '../repositories/game-repository.js';
import type { BattleshipService } from '../services/battleship-service.js';
import { BOT_PLAYER_ID } from '../services/bot-service.js';
import type { GameService } from '../services/game-service.js';
import type { AddShipsRequest } from '../types/index.js';
import * as Logger from '../utils/logger.js';
import * as ResponseBuilder from '../utils/response-builder.js';
import type { Connection } from '../websocket/connection.js';
import type { GameHandler } from './game-handler.js';

export class ShipHandler {
  private gameService: GameService;
  private battleshipService: BattleshipService;
  private gameRepository: GameRepository;
  private gameHandler: GameHandler;
  private getConnectionsCallback: () => Connection[];

  constructor(
    gameService: GameService,
    battleshipService: BattleshipService,
    gameRepository: GameRepository,
    gameHandler: GameHandler,
    getConnectionsCallback: () => Connection[]
  ) {
    this.gameService = gameService;
    this.battleshipService = battleshipService;
    this.gameRepository = gameRepository;
    this.gameHandler = gameHandler;
    this.getConnectionsCallback = getConnectionsCallback;
  }

  async handleAddShips(connection: Connection, data: unknown): Promise<void> {
    try {
      if (!connection.gameId) {
        connection.sendError(MESSAGE_TYPES.ADD_SHIPS, 'Not in a game');
        return;
      }

      if (!data || typeof data !== 'object') {
        connection.sendError(MESSAGE_TYPES.ADD_SHIPS, 'Invalid request data');
        return;
      }

      const shipData = data as AddShipsRequest;

      if (!shipData.gameId || !shipData.ships || typeof shipData.indexPlayer === 'undefined') {
        connection.sendError(MESSAGE_TYPES.ADD_SHIPS, 'Invalid request data');
        return;
      }

      const { gameId, ships } = shipData;

      this.battleshipService.validateShipPlacement(ships);

      if (connection.playerId) {
        this.gameService.addShips(gameId as number, connection.playerId, ships);
      }

      Logger.logResult(MESSAGE_TYPES.ADD_SHIPS, 'success', {
        gameId,
        playerId: connection.playerId,
        shipCount: ships.length,
      });

      const started = this.gameService.startGameIfReady(gameId as number);

      if (started) {
        const game = this.gameRepository.findById(gameId as number);
        if (!game) {
          return;
        }

        const connections = this.getConnectionsCallback();
        const playerConnections = game.players
          .map((playerId) =>
            connections.find((c) => c.playerId === playerId && c.gameId === gameId)
          )
          .filter((c): c is Connection => c !== undefined);

        const playerIndexMap: Record<number, number> = {};
        game.players.forEach((playerId, idx) => {
          playerIndexMap[playerId] = idx + 1;
        });

        for (const playerConnection of playerConnections) {
          if (playerConnection.playerId) {
            const playerShips = game.getPlayerShips(playerConnection.playerId);

            const response = ResponseBuilder.buildResponse(MESSAGE_TYPES.START_GAME, {
              ships: playerShips,
              currentPlayerIndex: playerIndexMap[playerConnection.playerId] || 1,
            });
            playerConnection.send(response);
          }
        }

        if (game.currentPlayerId) {
          const turnResponse = ResponseBuilder.buildResponse(MESSAGE_TYPES.TURN, {
            currentPlayer: playerIndexMap[game.currentPlayerId] || 1,
          });
          for (const playerConnection of playerConnections) {
            playerConnection.send(turnResponse);
          }
        }

        Logger.logResult(MESSAGE_TYPES.START_GAME, 'sent', {
          gameId,
          currentPlayer: game.currentPlayerId,
        });
        Logger.logResult(MESSAGE_TYPES.TURN, 'sent', {
          gameId,
          currentPlayer: game.currentPlayerId,
        });

        if (game.currentPlayerId === BOT_PLAYER_ID) {
          await this.gameHandler.checkAndPerformBotTurn(gameId as number, connection);
        }
      }
    } catch (error) {
      Logger.logError('Add ships error', error as Error);
      connection.sendError(
        MESSAGE_TYPES.ADD_SHIPS,
        (error as Error).message || 'Failed to add ships'
      );
    }
  }
}
