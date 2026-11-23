import AsyncStorage from '@react-native-async-storage/async-storage';

import { SKIN_IDS, type GameState, type SkinId } from '@/types/game';

const GAME_STORAGE_KEY = '@chromabolt/game-state';

export const DEFAULT_GAME_STATE: Readonly<GameState> = {
  currentStage: 1,
  highestUnlockedStage: 1,
  coins: 0,
  unlockedSkins: ['hex', 'gear', 'washer'],
  equippedSkin: 'hex',
  soundEnabled: true,
  hapticsEnabled: true,
};

type GameStateUpdate = Partial<GameState>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSkinId = (value: unknown): value is SkinId =>
  typeof value === 'string' && SKIN_IDS.includes(value as SkinId);

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isGameState = (value: unknown): value is GameState => {
  if (!isRecord(value)) {
    return false;
  }

  const unlockedSkins = value.unlockedSkins;

  return (
    isPositiveInteger(value.currentStage) &&
    isPositiveInteger(value.highestUnlockedStage) &&
    value.highestUnlockedStage >= value.currentStage &&
    isNonNegativeInteger(value.coins) &&
    Array.isArray(unlockedSkins) &&
    unlockedSkins.length > 0 &&
    unlockedSkins.every(isSkinId) &&
    isSkinId(value.equippedSkin) &&
    unlockedSkins.includes(value.equippedSkin) &&
    typeof value.soundEnabled === 'boolean' &&
    typeof value.hapticsEnabled === 'boolean'
  );
};

const cloneGameState = (state: GameState): GameState => ({
  ...state,
  unlockedSkins: [...state.unlockedSkins],
});

/** Loads a validated state, returning a safe default if storage is missing or corrupt. */
export const loadGameState = async (): Promise<GameState> => {
  try {
    const serializedState = await AsyncStorage.getItem(GAME_STORAGE_KEY);

    if (serializedState === null) {
      return cloneGameState(DEFAULT_GAME_STATE);
    }

    const parsedState: unknown = JSON.parse(serializedState);
    return isGameState(parsedState)
      ? cloneGameState(parsedState)
      : cloneGameState(DEFAULT_GAME_STATE);
  } catch {
    return cloneGameState(DEFAULT_GAME_STATE);
  }
};

/** Persists a snapshot and returns an independent copy for callers to consume. */
export const saveGameState = async (state: GameState): Promise<GameState> => {
  const stateToSave = cloneGameState(state);
  await AsyncStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(stateToSave));
  return cloneGameState(stateToSave);
};

/** Merges a typed update with the current snapshot before persisting it. */
export const updateGameState = async (
  update: GameStateUpdate,
): Promise<GameState> => {
  const currentState = await loadGameState();
  const nextState: GameState = {
    ...currentState,
    ...update,
    unlockedSkins: update.unlockedSkins
      ? [...update.unlockedSkins]
      : currentState.unlockedSkins,
  };

  if (!isGameState(nextState)) {
    throw new Error('The requested game state update is invalid.');
  }

  return saveGameState(nextState);
};

export const resetGameState = async (): Promise<GameState> =>
  saveGameState(cloneGameState(DEFAULT_GAME_STATE));

/** The only storage API game code should import. */
export const gameStorage = {
  load: loadGameState,
  save: saveGameState,
  update: updateGameState,
  reset: resetGameState,
};
