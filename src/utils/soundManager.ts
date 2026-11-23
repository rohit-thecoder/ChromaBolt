import { NativeModules } from 'react-native';

export type SoundEffect = 'error' | 'lift' | 'settle';

/**
 * Native sound files are optional during prototyping. Leaving this map empty
 * makes every request a no-op, which keeps Expo Go and web previews safe.
 */
const soundAssets: Partial<Record<SoundEffect, number>> = {};

interface PlaybackStatus {
  didJustFinish?: boolean;
}

interface NativeSound {
  setOnPlaybackStatusUpdate: (listener: (status: PlaybackStatus) => void) => void;
  unloadAsync: () => Promise<void>;
}

interface ExpoAvModule {
  Audio: {
    Sound: {
      createAsync: (
        asset: number,
        initialStatus: { shouldPlay: boolean; volume: number },
      ) => Promise<{ sound: NativeSound }>;
    };
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isExpoAvModule = (value: unknown): value is ExpoAvModule => {
  if (!isRecord(value) || !isRecord(value.Audio) || !isRecord(value.Audio.Sound)) {
    return false;
  }

  return typeof value.Audio.Sound.createAsync === 'function';
};

/**
 * Expo Go versions without ExponentAV must never evaluate the expo-av module.
 * Keeping the module name non-static also prevents Metro from eagerly loading
 * it while preserving a native implementation in compatible development builds.
 */
const getExpoAv = (): ExpoAvModule | undefined => {
  if (NativeModules.ExponentAV === undefined) {
    return undefined;
  }

  try {
    const moduleName = ['expo', 'av'].join('-');
    const module: unknown = require(moduleName);
    return isExpoAvModule(module) ? module : undefined;
  } catch {
    return undefined;
  }
};

let soundEnabled = true;

export const setSoundEnabled = (enabled: boolean): void => {
  soundEnabled = enabled;
};

export const playSoundEffect = async (effect: SoundEffect): Promise<void> => {
  const asset = soundAssets[effect];

  if (!soundEnabled || asset === undefined) {
    return;
  }

  const expoAv = getExpoAv();

  if (expoAv === undefined) {
    return;
  }

  try {
    const { sound } = await expoAv.Audio.Sound.createAsync(asset, {
      shouldPlay: true,
      volume: 0.55,
    });

    sound.setOnPlaybackStatusUpdate((status) => {
      if ('didJustFinish' in status && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    // Audio is an enhancement; unavailable native audio must never block play.
  }
};

