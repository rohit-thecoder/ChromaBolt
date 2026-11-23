export type SoundEffect = 'error' | 'lift' | 'settle';

let soundEnabled = true;

export const setSoundEnabled = (enabled: boolean): void => {
  soundEnabled = enabled;
};

/**
 * Audio is intentionally optional while the game runs in Expo Go. This safe
 * wrapper remains silent until a development-build audio adapter and bundled
 * sound assets are supplied; it never imports or requires a native AV module.
 */
export const playSoundEffect = async (_effect: SoundEffect): Promise<void> => {
  if (!soundEnabled) {
    return;
  }

  // Deliberate no-op: haptics remain available as tactile feedback in Expo Go.
};

