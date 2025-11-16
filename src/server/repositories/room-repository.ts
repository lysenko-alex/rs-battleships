import { Room } from '../models/room.js';

export class RoomRepository {
  private rooms: Map<number, Room>;
  private nextId: number;

  constructor() {
    this.rooms = new Map();
    this.nextId = 1;
  }

  create(playerId: number): Room {
    const id = this.nextId++;
    const room = new Room(id, playerId);
    this.rooms.set(id, room);
    return room;
  }

  findById(id: number): Room | null {
    return this.rooms.get(id) || null;
  }

  findAvailable(): Room[] {
    return Array.from(this.rooms.values()).filter((room) => !room.isFull() && room.gameId === null);
  }

  remove(id: number): boolean {
    return this.rooms.delete(id);
  }

  getAll(): Room[] {
    return Array.from(this.rooms.values());
  }
}
