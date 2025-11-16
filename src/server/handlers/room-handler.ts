import { MESSAGE_TYPES } from '../constants/message-types.js';
import type { PlayerRepository } from '../repositories/player-repository.js';
import type { RoomService } from '../services/room-service.js';
import type { AddUserToRoomRequest } from '../types/index.js';
import * as Logger from '../utils/logger.js';
import * as ResponseBuilder from '../utils/response-builder.js';
import * as Validators from '../utils/validators.js';
import type { Connection } from '../websocket/connection.js';

export class RoomHandler {
  private roomService: RoomService;
  private playerRepository: PlayerRepository;
  private getConnectionsCallback: () => Connection[];
  private broadcastCallback: (message: string) => void;

  constructor(
    roomService: RoomService,
    playerRepository: PlayerRepository,
    getConnectionsCallback: () => Connection[],
    broadcastCallback: (message: string) => void
  ) {
    this.roomService = roomService;
    this.playerRepository = playerRepository;
    this.getConnectionsCallback = getConnectionsCallback;
    this.broadcastCallback = broadcastCallback;
  }

  async handleCreateRoom(connection: Connection, data: unknown): Promise<void> {
    try {
      if (!connection.playerId) {
        connection.sendError(MESSAGE_TYPES.CREATE_ROOM, 'Must be registered first');
        return;
      }

      const room = this.roomService.createRoom(connection.playerId);
      connection.setRoom(room.id);

      Logger.logResult(MESSAGE_TYPES.CREATE_ROOM, 'success', { roomId: room.id });

      this.broadcastRooms();
    } catch (error) {
      Logger.logError('Create room error', error as Error);
      connection.sendError(
        MESSAGE_TYPES.CREATE_ROOM,
        (error as Error).message || 'Failed to create room'
      );
    }
  }

  async handleAddUserToRoom(connection: Connection, data: unknown): Promise<void> {
    try {
      if (!connection.playerId) {
        connection.sendError(MESSAGE_TYPES.ADD_USER_TO_ROOM, 'Must be registered first');
        return;
      }

      const validation = Validators.validateAddUserToRoom(data);
      if (!validation.valid) {
        connection.sendError(MESSAGE_TYPES.ADD_USER_TO_ROOM, validation.error || 'Invalid request');
        return;
      }

      const roomData = data as AddUserToRoomRequest;
      const { indexRoom } = roomData;
      const room = this.roomService.joinRoom(indexRoom as number, connection.playerId);
      connection.setRoom(room.id);

      Logger.logResult(MESSAGE_TYPES.ADD_USER_TO_ROOM, 'success', {
        roomId: room.id,
        playerId: connection.playerId,
      });

      if (room.isFull() && room.gameId) {
        const connections = this.getConnectionsCallback();
        const playerConnections = room.players
          .map((playerId) => connections.find((c) => c.playerId === playerId))
          .filter((c): c is Connection => c !== undefined);

        let playerIndex = 1;
        for (const playerConnection of playerConnections) {
          if (room.gameId) {
            playerConnection.setGame(room.gameId);
          }

          const response = ResponseBuilder.buildResponse(MESSAGE_TYPES.CREATE_GAME, {
            idGame: room.gameId,
            idPlayer: playerIndex,
          });
          playerConnection.send(response);
          playerIndex++;
        }

        Logger.logResult(MESSAGE_TYPES.CREATE_GAME, 'sent', {
          gameId: room.gameId,
          players: room.players.length,
        });
      }

      this.broadcastRooms();
    } catch (error) {
      Logger.logError('Add user to room error', error as Error);
      connection.sendError(
        MESSAGE_TYPES.ADD_USER_TO_ROOM,
        (error as Error).message || 'Failed to join room'
      );
    }
  }

  broadcastRooms(): void {
    const availableRooms = this.roomService.getAvailableRooms();
    const connections = this.getConnectionsCallback();
    const playerRepository = this.playerRepository;

    const roomsData = availableRooms.map((room) => {
      const roomUsers = room.players.map((playerId) => {
        const player = playerRepository.findById(playerId);
        return {
          name: player ? player.name : 'Unknown',
          index: playerId,
        };
      });

      return {
        roomId: room.id,
        roomUsers,
      };
    });

    const response = ResponseBuilder.buildResponse(MESSAGE_TYPES.UPDATE_ROOM, roomsData);
    this.broadcastCallback(response);
    Logger.logResult(MESSAGE_TYPES.UPDATE_ROOM, 'broadcast', { count: roomsData.length });
  }
}
