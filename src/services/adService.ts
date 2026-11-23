import { createElement, type ComponentType } from 'react';
import { Modal, NativeModules, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/theme/theme';

/** Replace these values with the production AdMob identifiers before an EAS build. */
export const PRODUCTION_AD_UNITS = {
  banner: 'ca-app-pub-REPLACE_ME/banner',
  interstitial: 'ca-app-pub-REPLACE_ME/interstitial',
  rewarded: 'ca-app-pub-REPLACE_ME/rewarded',
} as const;

const TEST_AD_UNITS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
} as const;

const ACTIVE_AD_UNITS = __DEV__ ? TEST_AD_UNITS : PRODUCTION_AD_UNITS;

export type RewardType = 'spareBolt' | 'undoRefill';
export type AdSource = 'mock' | 'native';

export interface RewardResult {
  rewarded: boolean;
  source: AdSource;
  rewardType: RewardType;
}

export interface InterstitialResult {
  shown: boolean;
  source: AdSource | 'skipped';
}

interface NativeFullScreenAd {
  addAdEventListener: (eventName: string, listener: () => void) => () => void;
  load: () => void;
  show: () => Promise<void>;
}

interface NativeAdFactory {
  createForAdRequest: (unitId: string) => NativeFullScreenAd;
}

interface NativeAdsModule {
  BannerAd?: ComponentType<{ size: string; unitId: string }>;
  InterstitialAd?: NativeAdFactory;
  RewardedAd?: NativeAdFactory;
}

const isNativeAdsModule = (value: unknown): value is NativeAdsModule =>
  typeof value === 'object' && value !== null;

/**
 * Do not move this lazy require to module scope. Expo Go does not contain the
 * RNGoogleMobileAds native module, and static imports would crash at startup.
 */
const getNativeAdsModule = (): NativeAdsModule | undefined => {
  if (NativeModules.RNGoogleMobileAdsModule === undefined) {
    return undefined;
  }

  try {
    const module: unknown = require('react-native-google-mobile-ads');
    return isNativeAdsModule(module) ? module : undefined;
  } catch {
    return undefined;
  }
};

const waitForNativeAd = async (
  factory: NativeAdFactory,
  unitId: string,
  rewardRequired: boolean,
): Promise<boolean> => {
  const ad = factory.createForAdRequest(unitId);

  return new Promise<boolean>((resolve) => {
    let rewarded = !rewardRequired;
    let finished = false;
    const finish = (didComplete: boolean): void => {
      if (finished) {
        return;
      }

      finished = true;
      subscriptions.forEach((unsubscribe) => unsubscribe());
      resolve(didComplete);
    };
    const subscriptions = [
      ad.addAdEventListener('loaded', () => {
        void ad.show().catch(() => finish(false));
      }),
      ad.addAdEventListener('earned_reward', () => {
        rewarded = true;
      }),
      ad.addAdEventListener('closed', () => finish(rewarded)),
      ad.addAdEventListener('error', () => finish(false)),
    ];

    ad.load();
  });
};

export const requestReward = async (rewardType: RewardType): Promise<RewardResult> => {
  const nativeAds = getNativeAdsModule();

  if (nativeAds?.RewardedAd === undefined) {
    return { rewarded: true, source: 'mock', rewardType };
  }

  try {
    const rewarded = await waitForNativeAd(nativeAds.RewardedAd, ACTIVE_AD_UNITS.rewarded, true);
    return { rewarded, source: 'native', rewardType };
  } catch {
    return { rewarded: true, source: 'mock', rewardType };
  }
};

export const showInterstitialAfterLevel = async (
  completedStage: number,
): Promise<InterstitialResult> => {
  if (completedStage <= 4 || completedStage % 3 !== 0) {
    return { shown: false, source: 'skipped' };
  }

  const nativeAds = getNativeAdsModule();

  if (nativeAds?.InterstitialAd === undefined) {
    return { shown: true, source: 'mock' };
  }

  try {
    const shown = await waitForNativeAd(nativeAds.InterstitialAd, ACTIVE_AD_UNITS.interstitial, false);
    return { shown, source: 'native' };
  } catch {
    return { shown: true, source: 'mock' };
  }
};

export function WorkshopBannerAd(): React.JSX.Element {
  const NativeBannerAd = getNativeAdsModule()?.BannerAd;

  if (NativeBannerAd !== undefined) {
    return createElement(NativeBannerAd, {
      size: 'ANCHORED_ADAPTIVE_BANNER',
      unitId: ACTIVE_AD_UNITS.banner,
    });
  }

  return createElement(
    View,
    { accessibilityLabel: 'Workshop sponsor banner', style: styles.banner },
    createElement(Text, { style: styles.bannerKicker }, 'WORKSHOP SPONSOR'),
    createElement(Text, { style: styles.bannerTitle }, 'PRECISION TOOLS • BUILT FOR MAKERS'),
  );
}

interface WorkshopAdModalProps {
  message: string;
  onClose: () => void;
  title: string;
  visible: boolean;
}

/** Native-module-safe simulated full-screen placement for Expo Go and web. */
export function WorkshopAdModal({
  message,
  onClose,
  title,
  visible,
}: WorkshopAdModalProps): React.JSX.Element {
  return createElement(
    Modal,
    { animationType: 'fade', onRequestClose: onClose, transparent: true, visible },
    createElement(
      View,
      { style: styles.modalBackdrop },
      createElement(
        View,
        { style: styles.modalCard },
        createElement(Text, { style: styles.bannerKicker }, 'WORKSHOP SPONSOR'),
        createElement(Text, { style: styles.modalTitle }, title),
        createElement(Text, { style: styles.modalMessage }, message),
        createElement(
          Pressable,
          { onPress: onClose, style: styles.modalButton },
          createElement(Text, { style: styles.modalButtonText }, 'CONTINUE'),
        ),
      ),
    ),
  );
}

export const adService = {
  requestReward,
  showInterstitialAfterLevel,
};

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: palette.blueprintGrid,
    borderColor: palette.steel,
    borderTopWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  bannerKicker: {
    color: palette.steel,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  bannerTitle: {
    color: palette.offWhite,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.35,
    marginTop: 3,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalButton: {
    backgroundColor: palette.brassAccent,
    borderRadius: 8,
    marginTop: 22,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  modalButtonText: {
    color: palette.workbenchSurface,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalCard: {
    alignItems: 'center',
    backgroundColor: palette.workbenchSurface,
    borderColor: palette.brassAccent,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 340,
    padding: 24,
    width: '100%',
  },
  modalMessage: {
    color: palette.steel,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    textAlign: 'center',
  },
  modalTitle: {
    color: palette.offWhite,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginTop: 8,
    textAlign: 'center',
  },
});

