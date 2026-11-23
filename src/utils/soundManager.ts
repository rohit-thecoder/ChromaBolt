import { Audio } from 'expo-av';

export type SoundEffect = 'error' | 'lift' | 'settle';

/**
 * Native sound files are optional during prototyping. Leaving this map empty
 * makes every request a no-op, which keeps Expo Go and web previews safe.
 */
const soundAssets: Partial<Record<SoundEffect, number>> = {};

let soundEnabled = true;

export const setSoundEnabled = (enabled: boolean): void => {
  soundEnabled = enabled;
};

export const playSoundEffect = async (effect: SoundEffect): Promise<void> => {
  const asset = soundAssets[effect];

  if (!soundEnabled || asset === undefined) {
    return;
  }

  try {
    const { sound } = await Audio.Sound.createAsync(asset, {
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

