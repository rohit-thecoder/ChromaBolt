export const SKIN_IDS = ['hex', 'gear', 'washer'] as const;

export type SkinId = (typeof SKIN_IDS)[number];

export const MAX_CAPACITY = 4;

export const NUT_COLORS = [
  'Crimson',
  'Cobalt',
  'Emerald',
  'Amber',
  'Violet',
  'Coral',
  'Cyan',
] as const;

export type NutColor = (typeof NUT_COLORS)[number];

export interface Nut {
  id: string;
  color: NutColor;
  isMystery?: boolean;
}

export interface Bolt {
  id: string;
  nuts: Nut[];
  isSpare?: boolean;
}

export interface LiftedNuts {
  sourceBoltId: string;
  nuts: Nut[];
}

export interface MoveHistoryEntry {
  sourceBoltId: string;
  destinationBoltId: string;
  movedNuts: Nut[];
  revealedNutId?: string;
}

export interface PuzzleState {
  bolts: Bolt[];
  moveHistory: MoveHistoryEntry[];
}

export interface MoveResult {
  state: PuzzleState;
  didMove: boolean;
}

export interface GeneratedLevel {
  stageNumber: number;
  colorCount: number;
  reverseMoveCount: number;
  bolts: Bolt[];
}

export interface GameState {
  currentStage: number;
  highestUnlockedStage: number;
  coins: number;
  unlockedSkins: SkinId[];
  equippedSkin: SkinId;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

