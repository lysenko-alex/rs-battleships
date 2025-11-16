import { MESSAGE_TYPES } from '../constants/message-types.js';
import type { GameRepository } from '../repositories/game-repository.js';
import type { WinnerRepository } from '../repositories/winner-repository.js';
import type { BattleshipService } from '../services/battleship-service.js';
import type { BotService } from '../services/bot-service.js';
import { BOT_PLAYER_ID } from '../services/bot-service.js';
import type { GameService } from '../services/game-service.js';
import type { AttackRequest, RandomAttackRequest } from '../types/index.js';
import * as Logger from '../utils/logger.js';
import * as ResponseBuilder from '../utils/response-builder.js';
import * as Validators from '../utils/validators.js';
import type { Connection } from '../websocket/connection.js';

export class GameHandler {
  private gameService: GameService;
  private battleshipService: BattleshipService;
  private gameRepository: GameRepository;
  private winnerRepository: WinnerRepository;
  private botService: BotService;
  private getConnectionsCallback: () => Connection[];
  private broadcastCallback: (message: string) => void;

  constructor(
    gameService: GameService,
    battleshipService: BattleshipService,
    gameRepository: GameRepository,
    winnerRepository: WinnerRepository,
    botService: BotService,
    getConnectionsCallback: () => Connection[],
    broadcastCallback: (message: string) => void
  ) {
    this.gameService = gameService;
    this.battleshipService = battleshipService;
    this.gameRepository = gameRepository;
    this.winnerRepository = winnerRepository;
    this.botService = botService;
    this.getConnectionsCallback = getConnectionsCallback;
    this.broadcastCallback = broadcastCallback;
  }

  async handleAttack(connection: Connection, data: unknown): Promise<void> {
    try {
      if (!connection.gameId || !connection.playerId) {
        connection.sendError(MESSAGE_TYPES.ATTACK, 'Not in a game');
        return;
      }

      const validation = Validators.validateAttack(data);
      if (!validation.valid) {
        connection.sendError(MESSAGE_TYPES.ATTACK, validation.error || 'Invalid attack data');
        return;
      }

      const attackData = data as AttackRequest;
      const { gameId, x, y } = attackData;

      const result = this.battleshipService.processAttack(
        gameId as number,
        connection.playerId,
        x,
        y
      );
      const game = this.gameRepository.findById(gameId as number);
      if (!game) {
        return;
      }

      const playerIndexMap: Record<number, number> = {};
      game.players.forEach((playerId, idx) => {
        playerIndexMap[playerId] = idx + 1;
      });

      const currentPlayerIndex = playerIndexMap[connection.playerId];

      const attackResponse = ResponseBuilder.buildResponse(MESSAGE_TYPES.ATTACK, {
        position: { x, y },
        currentPlayer: currentPlayerIndex,
        status: result.status,
      });

      const connections = this.getConnectionsCallback();
      const playerConnections = game.players
        .map((playerId) => connections.find((c) => c.playerId === playerId && c.gameId === gameId))
        .filter((c): c is Connection => c !== undefined);

      for (const playerConnection of playerConnections) {
        playerConnection.send(attackResponse);
      }

      Logger.logResult(MESSAGE_TYPES.ATTACK, 'success', {
        gameId,
        x,
        y,
        status: result.status,
      });

      if (result.status === 'killed' && result.ship) {
        const opponentId = game.players.find((id) => id !== connection.playerId);
        if (opponentId) {
          const adjacentCells = this.battleshipService.markKilledShip(
            gameId as number,
            opponentId,
            result.ship
          );

          for (const cell of adjacentCells) {
            const missResponse = ResponseBuilder.buildResponse(MESSAGE_TYPES.ATTACK, {
              position: cell,
              currentPlayer: currentPlayerIndex,
              status: 'miss',
            });

            for (const playerConnection of playerConnections) {
              playerConnection.send(missResponse);
            }
          }

          Logger.logResult(MESSAGE_TYPES.ATTACK, 'adjacent_misses', {
            count: adjacentCells.length,
          });
        }
      }

      const isWin = this.battleshipService.checkGameWin(gameId as number, connection.playerId);

      if (isWin) {
        game.finish(connection.playerId);
        this.gameRepository.update(game);
        this.winnerRepository.updateWinner(connection.playerId);

        const finishResponse = ResponseBuilder.buildResponse(MESSAGE_TYPES.FINISH, {
          winPlayer: currentPlayerIndex,
        });

        for (const playerConnection of playerConnections) {
          playerConnection.send(finishResponse);
        }

        Logger.logResult(MESSAGE_TYPES.FINISH, 'game_end', {
          gameId,
          winner: connection.playerId,
        });

        const winners = this.winnerRepository.getWinners();
        const winnersResponse = ResponseBuilder.buildResponse(
          MESSAGE_TYPES.UPDATE_WINNERS,
          winners
        );
        this.broadcastCallback(winnersResponse);
        Logger.logResult(MESSAGE_TYPES.UPDATE_WINNERS, 'broadcast', { count: winners.length });
      } else {
        if (result.status === 'miss') {
          this.gameService.switchTurn(gameId as number);
          const updatedGame = this.gameRepository.findById(gameId as number);
          if (updatedGame?.currentPlayerId) {
            const newCurrentPlayerIndex = playerIndexMap[updatedGame.currentPlayerId];

            const turnResponse = ResponseBuilder.buildResponse(MESSAGE_TYPES.TURN, {
              currentPlayer: newCurrentPlayerIndex,
            });

            for (const playerConnection of playerConnections) {
              playerConnection.send(turnResponse);
            }

            Logger.logResult(MESSAGE_TYPES.TURN, 'sent', {
              gameId,
              currentPlayer: updatedGame.currentPlayerId,
            });

            if (updatedGame.currentPlayerId === BOT_PLAYER_ID) {
              await this.checkAndPerformBotTurn(gameId as number, connection);
            }
          }
        } else {
          const turnResponse = ResponseBuilder.buildResponse(MESSAGE_TYPES.TURN, {
            currentPlayer: currentPlayerIndex,
          });

          for (const playerConnection of playerConnections) {
            playerConnection.send(turnResponse);
          }

          Logger.logResult(MESSAGE_TYPES.TURN, 'sent', {
            gameId,
            currentPlayer: connection.playerId,
          });

          if (connection.playerId === BOT_PLAYER_ID) {
            await this.checkAndPerformBotTurn(gameId as number, connection);
          }
        }
      }
    } catch (error) {
      Logger.logError('Attack error', error as Error);
      connection.sendError(MESSAGE_TYPES.ATTACK, (error as Error).message || 'Attack failed');
    }
  }

  async handleRandomAttack(connection: Connection, data: unknown): Promise<void> {
    try {
      if (!connection.gameId || !connection.playerId) {
        connection.sendError(MESSAGE_TYPES.RANDOM_ATTACK, 'Not in a game');
        return;
      }

      const validation = Validators.validateAttack(data);
      if (!validation.valid) {
        connection.sendError(
          MESSAGE_TYPES.RANDOM_ATTACK,
          validation.error || 'Invalid attack data'
        );
        return;
      }

      const randomAttackData = data as RandomAttackRequest;
      const { gameId } = randomAttackData;

      const { x, y } = this.battleshipService.generateRandomAttack(
        gameId as number,
        connection.playerId
      );

      await this.handleAttack(connection, {
        gameId,
        x,
        y,
        indexPlayer: randomAttackData.indexPlayer,
      });
    } catch (error) {
      Logger.logError('Random attack error', error as Error);
      connection.sendError(
        MESSAGE_TYPES.RANDOM_ATTACK,
        (error as Error).message || 'Random attack failed'
      );
    }
  }

  async handleSinglePlay(connection: Connection, _data: unknown): Promise<void> {
    try {
      if (!connection.playerId) {
        connection.sendError(MESSAGE_TYPES.SINGLE_PLAY, 'Must be registered first');
        return;
      }

      Logger.logResult(MESSAGE_TYPES.SINGLE_PLAY, 'received', {
        playerId: connection.playerId,
      });

      const singlePlayRoomId = -connection.playerId;
      const game = this.gameRepository.create(singlePlayRoomId, [
        connection.playerId,
        BOT_PLAYER_ID,
      ]);
      connection.setGame(game.id);

      const botShips = this.botService.generateRandomShips();
      this.gameService.addShips(game.id, BOT_PLAYER_ID, botShips);

      Logger.logResult(MESSAGE_TYPES.SINGLE_PLAY, 'bot_ships_placed', {
        gameId: game.id,
        shipCount: botShips.length,
      });

      const response = ResponseBuilder.buildResponse(MESSAGE_TYPES.CREATE_GAME, {
        idGame: game.id,
        idPlayer: 1,
      });
      connection.send(response);

      Logger.logResult(MESSAGE_TYPES.CREATE_GAME, 'sent', {
        gameId: game.id,
        playerId: connection.playerId,
      });
    } catch (error) {
      Logger.logError('Single play error', error as Error);
      connection.sendError(
        MESSAGE_TYPES.SINGLE_PLAY,
        (error as Error).message || 'Single play failed'
      );
    }
  }

  async checkAndPerformBotTurn(gameId: number, connection: Connection): Promise<void> {
    const game = this.gameRepository.findById(gameId);
    if (!game) {
      return;
    }

    if (game.currentPlayerId === BOT_PLAYER_ID && game.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        const { x, y } = this.battleshipService.generateRandomAttack(gameId, BOT_PLAYER_ID);

        const originalPlayerId = connection.playerId;
        connection.playerId = BOT_PLAYER_ID;

        try {
          await this.handleAttack(connection, {
            gameId,
            x,
            y,
            indexPlayer: 2,
          });
        } finally {
          connection.playerId = originalPlayerId;
        }
      } catch (error) {
        Logger.logError('Bot attack error', error as Error);
      }
    }
  }
}
