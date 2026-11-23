export const SKIN_IDS = ['hex', 'gear', 'washer'] as const;

export type SkinId = (typeof SKIN_IDS)[number];

export interface GameState {
  currentStage: number;
  highestUnlockedStage: number;
  coins: number;
  unlockedSkins: SkinId[];
  equippedSkin: SkinId;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}
