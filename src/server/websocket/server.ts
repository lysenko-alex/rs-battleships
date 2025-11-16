import { WebSocketServer } from 'ws';
import * as Logger from '../utils/logger.js';
import { Connection } from './connection.js';
import type { MessageHandler } from './message-handler.js';

export class WebSocketServerManager {
  private port: number;
  private messageHandler: MessageHandler;
  private connections: Set<Connection>;
  private wss: WebSocketServer | null;

  constructor(messageHandler: MessageHandler, port = 3000) {
    this.port = port;
    this.messageHandler = messageHandler;
    this.connections = new Set();
    this.wss = null;
  }

  start(): WebSocketServer {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws) => {
      const connection = new Connection(ws);
      this.connections.add(connection);

      Logger.logConnection(
        `New connection established. Total connections: ${this.connections.size}`
      );

      ws.on('message', async (data) => {
        try {
          const message = data.toString();
          await this.messageHandler.handleMessage(connection, message);
        } catch (error) {
          Logger.logError('Error processing message', error as Error);
        }
      });

      ws.on('error', (error) => {
        Logger.logError('WebSocket error', error);
      });

      ws.on('close', () => {
        this.connections.delete(connection);
        Logger.logConnection(`Connection closed. Total connections: ${this.connections.size}`);
      });
    });

    Logger.logInfo(`WebSocket server started on port ${this.port}`);
    return this.wss;
  }

  getConnections(): Connection[] {
    return Array.from(this.connections);
  }

  broadcast(message: string): number {
    let sentCount = 0;
    for (const connection of this.connections) {
      try {
        connection.send(message);
        sentCount++;
      } catch (error) {
        Logger.logError('Error broadcasting message', error as Error);
      }
    }
    return sentCount;
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }

      for (const connection of this.connections) {
        try {
          connection.ws.close();
        } catch (error) {
          Logger.logError('Error closing connection', error as Error);
        }
      }

      this.wss.close(() => {
        Logger.logInfo('WebSocket server closed');
        resolve();
      });
    });
  }
}
