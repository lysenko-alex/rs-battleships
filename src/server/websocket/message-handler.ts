import { MESSAGE_TYPES } from '../constants/message-types.js';
import type { GameHandler } from '../handlers/game-handler.js';
import type { PlayerHandler } from '../handlers/player-handler.js';
import type { RoomHandler } from '../handlers/room-handler.js';
import type { ShipHandler } from '../handlers/ship-handler.js';
import * as Logger from '../utils/logger.js';
import * as Validators from '../utils/validators.js';
import type { Connection } from './connection.js';

export class MessageHandler {
  private playerHandler: PlayerHandler;
  private roomHandler: RoomHandler;
  private shipHandler: ShipHandler;
  private gameHandler: GameHandler;

  constructor(
    playerHandler: PlayerHandler,
    roomHandler: RoomHandler,
    shipHandler: ShipHandler,
    gameHandler: GameHandler
  ) {
    this.playerHandler = playerHandler;
    this.roomHandler = roomHandler;
    this.shipHandler = shipHandler;
    this.gameHandler = gameHandler;
  }

  async handleMessage(connection: Connection, rawMessage: string): Promise<void> {
    try {
      let message: unknown;
      try {
        message = JSON.parse(rawMessage);
      } catch (error) {
        Logger.logError('Invalid JSON message', error as Error);
        connection.sendError('error', 'Invalid JSON format');
        return;
      }

      const validation = Validators.validateMessage(message);
      if (!validation.valid) {
        Logger.logError(
          'Invalid message structure',
          new Error(validation.error || 'Unknown error')
        );
        const msg = message as { type?: string };
        connection.sendError(msg.type || 'error', validation.error || 'Invalid message');
        return;
      }

      const msg = message as { type: string; data: unknown };
      const { type, data: rawData } = msg;
      let data: unknown;
      try {
        data = JSON.parse(rawData as string);
      } catch (error) {
        Logger.logError('Invalid JSON data', error as Error);
        connection.sendError('error', 'Invalid JSON format');
        data = '';
      }

      Logger.logCommand(type, data);

      switch (type) {
        case MESSAGE_TYPES.REG:
          await this.playerHandler.handleRegistration(connection, data);
          break;

        case MESSAGE_TYPES.CREATE_ROOM:
          await this.roomHandler.handleCreateRoom(connection, data);
          break;

        case MESSAGE_TYPES.ADD_USER_TO_ROOM:
          await this.roomHandler.handleAddUserToRoom(connection, data);
          break;

        case MESSAGE_TYPES.ADD_SHIPS:
          await this.shipHandler.handleAddShips(connection, data);
          break;

        case MESSAGE_TYPES.ATTACK:
          await this.gameHandler.handleAttack(connection, data);
          break;

        case MESSAGE_TYPES.RANDOM_ATTACK:
          await this.gameHandler.handleRandomAttack(connection, data);
          break;

        case MESSAGE_TYPES.SINGLE_PLAY:
          await this.gameHandler.handleSinglePlay(connection, data);
          break;

        default:
          Logger.logError(`Unknown message type: ${type}`);
          connection.sendError(type, `Unknown message type: ${type}`);
      }
    } catch (error) {
      Logger.logError('Message handling error', error as Error);
      connection.sendError('error', (error as Error).message || 'Internal server error');
    }
  }
}
