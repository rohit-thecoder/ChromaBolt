import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { WorkshopBannerAd } from '@/services/adService';
import { palette } from '@/theme/theme';

interface StageCompleteScreenProps {
  coinsRewarded: number;
  movesUsed: number;
  onNext: () => void;
  stageNumber: number;
}

export function StageCompleteScreen({
  coinsRewarded,
  movesUsed,
  onNext,
  stageNumber,
}: StageCompleteScreenProps): React.JSX.Element {
  const stampScale = useSharedValue(1.7);
  const stampRotation = useSharedValue(-8);

  useEffect(() => {
    stampScale.value = withSequence(withSpring(0.92, { damping: 7, stiffness: 250 }), withSpring(1));
    stampRotation.value = withTiming(0, { duration: 260 });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
  }, [stampRotation, stampScale]);

  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${stampRotation.value}deg` }, { scale: stampScale.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>BLUEPRINT #{stageNumber.toString().padStart(3, '0')}</Text>
        <Animated.View style={[styles.stamp, stampStyle]}>
          <Text style={styles.stampText}>BLUEPRINT{`\n`}VERIFIED</Text>
        </Animated.View>
        <View style={styles.metrics}>
          <View>
            <Text style={styles.metricLabel}>MOVES USED</Text>
            <Text style={styles.metricValue}>{movesUsed}</Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>COINS REWARDED</Text>
            <Text style={styles.rewardValue}>+{coinsRewarded}</Text>
          </View>
        </View>
        <Pressable onPress={onNext} style={styles.nextButton}>
          <Text style={styles.nextButtonText}>NEXT BLUEPRINT</Text>
        </Pressable>
      </View>
      <WorkshopBannerAd />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  eyebrow: { color: palette.steel, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 28 },
  metricLabel: { color: palette.steel, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  metricValue: { color: palette.offWhite, fontSize: 28, fontWeight: '900', marginTop: 5 },
  metrics: { borderColor: palette.blueprintGrid, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', marginTop: 36, paddingTop: 20, width: '100%' },
  nextButton: { alignItems: 'center', backgroundColor: palette.brassAccent, borderRadius: 9, marginTop: 34, paddingHorizontal: 24, paddingVertical: 16 },
  nextButtonText: { color: palette.workbenchSurface, fontSize: 13, fontWeight: '900', letterSpacing: 0.9 },
  rewardValue: { color: palette.brassAccent, fontSize: 28, fontWeight: '900', marginTop: 5 },
  stamp: { alignItems: 'center', borderColor: palette.brassAccent, borderRadius: 9, borderWidth: 4, paddingHorizontal: 24, paddingVertical: 15 },
  stampText: { color: palette.brassAccent, fontSize: 30, fontWeight: '900', letterSpacing: 1.4, lineHeight: 34, textAlign: 'center' },
});

