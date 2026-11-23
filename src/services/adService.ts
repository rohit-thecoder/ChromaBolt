export type RewardType = 'spareBolt' | 'undoRefill';

export interface RewardResult {
  rewarded: boolean;
  source: 'mock';
  rewardType: RewardType;
}

/**
 * The app deliberately exposes no native ad SDK to screens. This safe Expo Go
 * implementation grants a deterministic mock reward until a development build
 * supplies a native adapter behind this same contract.
 */
export const requestReward = async (rewardType: RewardType): Promise<RewardResult> => ({
  rewarded: true,
  source: 'mock',
  rewardType,
});

export const adService = { requestReward };

