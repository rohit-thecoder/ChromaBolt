import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { getLiftedNuts } from '@/engine/gameLogic';
import { playSoundEffect } from '@/utils/soundManager';
import { palette, nutFinishes } from '@/theme/theme';
import type { Bolt, Nut, SkinId } from '@/types/game';

export type BoltFeedback = 'drop' | 'invalid' | 'lift' | 'none';

interface BoltAssemblyProps {
  bolt: Bolt;
  skin: SkinId;
  isSelected: boolean;
  isValidDestination: boolean;
  invalidSignal: number;
  hapticsEnabled?: boolean;
  onPress: (boltId: string) => Promise<BoltFeedback>;
}

interface NutVisualProps {
  index: number;
  isLifted: boolean;
  nut: Nut;
  skin: SkinId;
  size: number;
}

const NUT_HEIGHT = 19;
const BASE_OFFSET = 24;

const nutColor = (nut: Nut): string =>
  nut.isMystery ? palette.blueprintGrid : nutFinishes[nut.color];

function NutVisual({ index, isLifted, nut, skin, size }: NutVisualProps): React.JSX.Element {
  const settleY = useSharedValue(-10);
  const liftY = useSharedValue(0);

  useEffect(() => {
    settleY.value = withSpring(0, { damping: 13, stiffness: 190 });
  }, [settleY]);

  useEffect(() => {
    liftY.value = withSpring(isLifted ? -(NUT_HEIGHT + 8) : 0, {
      damping: 12,
      stiffness: 210,
    });
  }, [isLifted, liftY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settleY.value + liftY.value }],
  }));
  const y = size - BASE_OFFSET - (index + 1) * NUT_HEIGHT;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.nutLayer, { height: NUT_HEIGHT + 3, top: y - 2, width: size }, animatedStyle]}>
      <Svg height={NUT_HEIGHT + 3} viewBox={`0 0 ${size} ${NUT_HEIGHT + 3}`} width={size}>
        <NutShape color={nutColor(nut)} isMystery={nut.isMystery === true} size={size} skin={skin} />
      </Svg>
    </Animated.View>
  );
}

function NutShape({
  color,
  isMystery,
  size,
  skin,
}: {
  color: string;
  isMystery: boolean;
  size: number;
  skin: SkinId;
}): React.JSX.Element {
  const center = size / 2;
  const edge = Math.max(7, size * 0.17);
  const highlight = isMystery ? palette.steel : palette.offWhite;

  if (skin === 'washer') {
    return (
      <>
        <Circle cx={center} cy={NUT_HEIGHT / 2 + 1} fill={color} r={Math.min(center - 2, 8)} />
        <Circle cx={center} cy={NUT_HEIGHT / 2 + 1} fill={palette.workbenchSurface} r={3.1} />
        <Circle cx={center} cy={NUT_HEIGHT / 2 + 1} fill="none" r={Math.min(center - 2, 8)} stroke={highlight} strokeOpacity="0.4" strokeWidth="1" />
        {isMystery && <SvgText fill={palette.offWhite} fontSize="11" fontWeight="700" textAnchor="middle" x={center} y="14">?</SvgText>}
      </>
    );
  }

  const hexPoints = `${center - edge},2 ${center + edge},2 ${size - 3},7 ${size - 3},${NUT_HEIGHT - 4} ${center + edge},${NUT_HEIGHT + 1} ${center - edge},${NUT_HEIGHT + 1} 3,${NUT_HEIGHT - 4} 3,7`;
  const gearPoints = `${center - edge},2 ${center - 3},2 ${center},0 ${center + 3},2 ${center + edge},2 ${center + edge + 2},6 ${size - 2},8 ${size - 2},${NUT_HEIGHT - 5} ${center + edge + 2},${NUT_HEIGHT - 3} ${center + edge},${NUT_HEIGHT + 1} ${center + 3},${NUT_HEIGHT + 2} ${center},${NUT_HEIGHT + 3} ${center - 3},${NUT_HEIGHT + 2} ${center - edge},${NUT_HEIGHT + 1} ${center - edge - 2},${NUT_HEIGHT - 3} 2,${NUT_HEIGHT - 5} 2,8 ${center - edge - 2},6`;

  return (
    <>
      <Polygon fill={color} points={skin === 'gear' ? gearPoints : hexPoints} />
      <Path d={`M 4 7 L ${center - edge} 3 H ${center + edge} L ${size - 4} 7`} fill="none" stroke={highlight} strokeOpacity="0.5" strokeWidth="1.1" />
      <Line stroke={palette.workbenchSurface} strokeOpacity="0.55" strokeWidth="2" x1={center} x2={center} y1="4" y2={NUT_HEIGHT - 1} />
      {isMystery && <SvgText fill={palette.offWhite} fontSize="12" fontWeight="700" textAnchor="middle" x={center} y="15">?</SvgText>}
    </>
  );
}

/** A tappable bolt with native-driver lift, settle, and invalid-target feedback. */
export function BoltAssembly({
  bolt,
  skin,
  isSelected,
  isValidDestination,
  invalidSignal,
  hapticsEnabled = true,
  onPress,
}: BoltAssemblyProps): React.JSX.Element {
  const shakeX = useSharedValue(0);
  const boltSize = 58;
  const liftedNutIds = new Set(getLiftedNuts(bolt).map((nut) => nut.id));
  const capacity = bolt.capacity ?? 4;
  const isCompleted = bolt.nuts.length === capacity && bolt.nuts.every((nut) => nut.color === bolt.nuts[0]?.color);

  useEffect(() => {
    if (invalidSignal > 0) {
      shakeX.value = withSequence(
        withTiming(-5, { duration: 45 }),
        withTiming(5, { duration: 70 }),
        withTiming(-4, { duration: 65 }),
        withTiming(0, { duration: 55 }),
      );
    }
  }, [invalidSignal, shakeX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handlePress = (): void => {
    void onPress(bolt.id).then(async (feedback) => {
      try {
        if (feedback === 'lift') {
          if (hapticsEnabled) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          await playSoundEffect('lift');
        } else if (feedback === 'drop') {
          if (hapticsEnabled) {
            await Haptics.impactAsync(
              liftedNutIds.size > 1
                ? Haptics.ImpactFeedbackStyle.Heavy
                : Haptics.ImpactFeedbackStyle.Medium,
            );
          }
          await playSoundEffect('settle');
        } else if (feedback === 'invalid') {
          if (hapticsEnabled) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          await playSoundEffect('error');
        }
      } catch {
        // Haptics are unavailable on some devices and web previews.
      }
    });
  };

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        accessibilityHint="Select a source bolt or a valid destination bolt"
        accessibilityLabel={`Bolt with ${bolt.nuts.length} nuts`}
        accessibilityRole="button"
        disabled={isCompleted}
        onPress={handlePress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
        <View
          style={[
            styles.assembly,
            isSelected && styles.selectedAssembly,
            isValidDestination && styles.destinationAssembly,
            isCompleted && styles.completedAssembly,
          ]}>
          <Svg height={100} viewBox={`0 0 ${boltSize} 100`} width={boltSize}>
            <Rect fill={palette.workbenchSurface} height="100" width={boltSize} x="0" y="0" />
            <Rect fill={palette.blueprintGrid} height="14" rx="3" width={boltSize - 4} x="2" y="83" />
            <Rect fill={palette.steel} height="4" rx="2" width={boltSize - 12} x="6" y="86" />
            <Rect fill="#64748B" height="64" rx="4" width="8" x={boltSize / 2 - 4} y="19" />
            <Line stroke="#CBD5E1" strokeWidth="1" x1={boltSize / 2 - 2} x2={boltSize / 2 - 2} y1="21" y2="80" />
            {[31, 40, 49, 58, 67, 76].map((y) => (
              <Path d={`M ${boltSize / 2 - 4} ${y + 2} L ${boltSize / 2 + 4} ${y - 2}`} key={y} stroke={palette.workbenchSurface} strokeWidth="1.2" />
            ))}
            <Polygon fill={palette.steel} points={`${boltSize / 2 - 6},13 ${boltSize / 2 - 3},9 ${boltSize / 2 + 3},9 ${boltSize / 2 + 6},13 ${boltSize / 2 + 3},17 ${boltSize / 2 - 3},17`} />
            <Circle cx={boltSize / 2} cy="13" fill={palette.workbenchSurface} r="2.5" />
            {bolt.isSpare && <Circle cx={boltSize / 2} cy="16" fill={palette.brassAccent} r="2" />}
            {isCompleted && <><Circle cx={boltSize / 2} cy="10" fill="none" r="10" stroke={palette.brassAccent} strokeOpacity="0.65" strokeWidth="1.5" /><Polygon fill={palette.brassAccent} points={`${boltSize / 2 - 6},6 ${boltSize / 2 + 6},6 ${boltSize / 2 + 8},11 ${boltSize / 2 + 6},16 ${boltSize / 2 - 6},16 ${boltSize / 2 - 8},11`} /></>}
          </Svg>
          {bolt.nuts.map((nut, index) => (
            <NutVisual
              index={index}
              isLifted={isSelected && liftedNutIds.has(nut.id)}
              key={nut.id}
              nut={nut}
              size={boltSize}
              skin={skin}
            />
          ))}
          <View pointerEvents="none" style={styles.capacityMarks}>
            {Array.from({ length: capacity }, (_, index) => (
              <View key={index} style={styles.capacityMark} />
            ))}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  assembly: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    height: 102,
    justifyContent: 'center',
    position: 'relative',
    width: 58,
  },
  capacityMark: {
    backgroundColor: palette.steel,
    borderRadius: 2,
    height: 3,
    opacity: 0.45,
    width: 3,
  },
  capacityMarks: {
    flexDirection: 'row',
    gap: 2,
    position: 'absolute',
    right: 2,
    top: 3,
  },
  destinationAssembly: {
    borderColor: palette.brassAccent,
  },
  nutLayer: {
    left: 0,
    position: 'absolute',
  },
  pressed: {
    opacity: 0.86,
  },
  pressable: {
    borderRadius: 12,
  },
  selectedAssembly: {
    backgroundColor: palette.blueprintGrid,
    borderColor: palette.offWhite,
  },
  completedAssembly: {
    borderColor: palette.brassAccent,
    shadowColor: palette.brassAccent,
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  wrapper: {
    alignItems: 'center',
  },
});

