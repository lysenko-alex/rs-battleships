import { MESSAGE_TYPES } from '../constants/message-types.js';
import type { WinnerRepository } from '../repositories/winner-repository.js';
import type { AuthService } from '../services/auth-service.js';
import type { RegistrationRequest } from '../types/index.js';
import * as Logger from '../utils/logger.js';
import * as ResponseBuilder from '../utils/response-builder.js';
import * as Validators from '../utils/validators.js';
import type { Connection } from '../websocket/connection.js';

export class PlayerHandler {
  private authService: AuthService;
  private winnerRepository: WinnerRepository;
  private broadcastCallback: (message: string) => void;

  constructor(
    authService: AuthService,
    winnerRepository: WinnerRepository,
    broadcastCallback: (message: string) => void
  ) {
    this.authService = authService;
    this.winnerRepository = winnerRepository;
    this.broadcastCallback = broadcastCallback;
  }

  async handleRegistration(connection: Connection, data: unknown): Promise<void> {
    try {
      const validation = Validators.validateRegistration(data);
      if (!validation.valid) {
        Logger.logResult('reg', 'error', { error: validation.error });
        connection.sendError('reg', validation.error || 'Invalid registration data');
        return;
      }

      const regData = data as RegistrationRequest;
      const { name, password } = regData;

      const { player } = this.authService.register(name, password);

      const response = ResponseBuilder.buildRegistrationResponse(player.name, player.id, false, '');
      console.log('response', response);
      connection.send(response);
      connection.setPlayer(player.id, player.name);

      Logger.logResult('reg', 'success', { name: player.name, index: player.id });

      this.broadcastWinners();
    } catch (error) {
      Logger.logError('Registration error', error as Error);
      connection.sendError('reg', (error as Error).message || 'Registration failed');
    }
  }

  broadcastWinners(): void {
    const winners = this.winnerRepository.getWinners();
    const response = ResponseBuilder.buildResponse(MESSAGE_TYPES.UPDATE_WINNERS, winners);
    this.broadcastCallback(response);
    Logger.logResult(MESSAGE_TYPES.UPDATE_WINNERS, 'broadcast', { count: winners.length });
  }
}
