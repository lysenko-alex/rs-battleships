export const MESSAGE_TYPES = {
  REG: 'reg',
  UPDATE_WINNERS: 'update_winners',
  CREATE_ROOM: 'create_room',
  ADD_USER_TO_ROOM: 'add_user_to_room',
  UPDATE_ROOM: 'update_room',
  CREATE_GAME: 'create_game',
  ADD_SHIPS: 'add_ships',
  START_GAME: 'start_game',
  ATTACK: 'attack',
  RANDOM_ATTACK: 'randomAttack',
  TURN: 'turn',
  FINISH: 'finish',
  SINGLE_PLAY: 'single_play',
} as const;

export const SHIP_TYPES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  HUGE: 'huge',
} as const;

export const SHIP_LENGTHS: Record<string, number> = {
  [SHIP_TYPES.SMALL]: 1,
  [SHIP_TYPES.MEDIUM]: 2,
  [SHIP_TYPES.LARGE]: 3,
  [SHIP_TYPES.HUGE]: 4,
};

export const ATTACK_STATUS = {
  MISS: 'miss',
  SHOT: 'shot',
  KILLED: 'killed',
} as const;

export const GAME_STATUS = {
  WAITING: 'waiting',
  IN_PROGRESS: 'in_progress',
  FINISHED: 'finished',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
export type ShipType = (typeof SHIP_TYPES)[keyof typeof SHIP_TYPES];
export type AttackStatus = (typeof ATTACK_STATUS)[keyof typeof ATTACK_STATUS];
export type GameStatus = (typeof GAME_STATUS)[keyof typeof GAME_STATUS];
