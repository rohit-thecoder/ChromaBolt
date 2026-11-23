import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '@/theme/theme';
import type { GameState, SkinId } from '@/types/game';

interface HomeScreenProps {
  gameState: GameState;
  onContinue: () => void;
  onOpenStageSelect: () => void;
  onUpdateGameState: (update: Partial<GameState>) => Promise<void>;
}

const SKIN_COSTS: Record<SkinId, number> = {
  gear: 125,
  hex: 0,
  washer: 250,
};

const SKIN_NAMES: Record<SkinId, string> = {
  gear: 'Gear Profile',
  hex: 'Hex Profile',
  washer: 'Round Washer',
};

function MechanicalHero(): React.JSX.Element {
  const threadY = useSharedValue(-10);
  const rotation = useSharedValue(0);

  useEffect(() => {
    threadY.value = withRepeat(
      withSequence(withTiming(14, { duration: 1750 }), withTiming(-10, { duration: 1750 })),
      -1,
      false,
    );
    rotation.value = withRepeat(withTiming(360, { duration: 3500 }), -1, false);
  }, [rotation, threadY]);

  const nutStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: threadY.value }, { rotateZ: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.hero}>
      <View style={styles.heroBase} />
      <View style={styles.heroBolt}>
        {[0, 1, 2, 3, 4, 5].map((thread) => (
          <View key={thread} style={[styles.thread, { top: 13 + thread * 17 }]} />
        ))}
      </View>
      <Animated.View style={[styles.heroNut, nutStyle]}>
        <View style={styles.heroNutHole} />
      </Animated.View>
    </View>
  );
}

export function HomeScreen({
  gameState,
  onContinue,
  onOpenStageSelect,
  onUpdateGameState,
}: HomeScreenProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const [skinsVisible, setSkinsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const selectSkin = async (skin: SkinId): Promise<void> => {
    const isUnlocked = gameState.unlockedSkins.includes(skin);

    if (isUnlocked) {
      await onUpdateGameState({ equippedSkin: skin });
      return;
    }

    const cost = SKIN_COSTS[skin];
    if (gameState.coins < cost) {
      return;
    }

    await onUpdateGameState({
      coins: gameState.coins - cost,
      equippedSkin: skin,
      unlockedSkins: [...gameState.unlockedSkins, skin],
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
    <View style={[styles.container, { paddingHorizontal: Math.max(18, width * 0.06) }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>CHROMABOLT</Text>
          <Text style={styles.title}>WORKSHOP SORT</Text>
        </View>
        <Pressable onPress={() => setSettingsVisible(true)} style={styles.gearButton}>
          <Text style={styles.gearText}>⚙</Text>
        </Pressable>
      </View>

      <View style={styles.stageBadge}>
        <Text style={styles.stageText}>
          BLUEPRINT #{gameState.currentStage.toString().padStart(3, '0')}
        </Text>
      </View>
      <MechanicalHero />
      <Text style={styles.coinsText}>BRASS TOKENS {gameState.coins}</Text>

      <View style={styles.actions}>
        <Pressable onPress={onContinue} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>CONTINUE SORTING</Text>
        </Pressable>
        <Pressable onPress={onOpenStageSelect} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>STAGE SELECT</Text>
        </Pressable>
        <Pressable onPress={() => setSkinsVisible(true)} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>WORKSHOP SKINS</Text>
        </Pressable>
      </View>

      <Modal animationType="slide" onRequestClose={() => setSkinsVisible(false)} transparent visible={skinsVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>WORKSHOP SKINS</Text>
            {(['hex', 'gear', 'washer'] as const).map((skin) => {
              const unlocked = gameState.unlockedSkins.includes(skin);
              const equipped = gameState.equippedSkin === skin;
              const label = unlocked ? (equipped ? 'EQUIPPED' : 'EQUIP') : `${SKIN_COSTS[skin]} TOKENS`;

              return (
                <Pressable key={skin} onPress={() => void selectSkin(skin)} style={styles.skinRow}>
                  <View>
                    <Text style={styles.skinName}>{SKIN_NAMES[skin]}</Text>
                    <Text style={styles.skinStatus}>{unlocked ? 'OWNED' : 'UNLOCK WITH EARNED TOKENS'}</Text>
                  </View>
                  <Text style={styles.skinAction}>{label}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => setSkinsVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" onRequestClose={() => setSettingsVisible(false)} transparent visible={settingsVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>WORKSHOP SETTINGS</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>SOUND</Text>
              <Switch
                onValueChange={(soundEnabled) => void onUpdateGameState({ soundEnabled })}
                thumbColor={palette.offWhite}
                trackColor={{ false: palette.blueprintGrid, true: palette.brassAccent }}
                value={gameState.soundEnabled}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>HAPTICS</Text>
              <Switch
                onValueChange={(hapticsEnabled) => void onUpdateGameState({ hapticsEnabled })}
                thumbColor={palette.offWhite}
                trackColor={{ false: palette.blueprintGrid, true: palette.brassAccent }}
                value={gameState.hapticsEnabled}
              />
            </View>
            <Pressable onPress={() => setSettingsVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, width: '100%' },
  closeButton: { alignSelf: 'center', marginTop: 20, padding: 10 },
  closeButtonText: { color: palette.steel, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  coinsText: { color: palette.brassAccent, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 24 },
  container: { alignItems: 'center', flex: 1, padding: 22 },
  safeArea: { flex: 1 },
  eyebrow: { color: palette.steel, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  gearButton: { alignItems: 'center', borderColor: palette.steel, borderRadius: 19, borderWidth: 1, height: 38, justifyContent: 'center', width: 38 },
  gearText: { color: palette.offWhite, fontSize: 20 },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  hero: { alignItems: 'center', height: 230, justifyContent: 'flex-end', marginVertical: 18, position: 'relative', width: 160 },
  heroBase: { backgroundColor: palette.blueprintGrid, borderColor: palette.steel, borderRadius: 10, borderWidth: 1, height: 30, width: 150 },
  heroBolt: { backgroundColor: palette.steel, borderRadius: 7, bottom: 23, height: 155, position: 'absolute', width: 14 },
  heroNut: { alignItems: 'center', backgroundColor: palette.brassAccent, borderColor: palette.offWhite, borderRadius: 12, borderWidth: 2, bottom: 103, height: 32, justifyContent: 'center', position: 'absolute', width: 74 },
  heroNutHole: { backgroundColor: palette.workbenchSurface, borderRadius: 7, height: 14, width: 20 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.68)', flex: 1, justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: palette.workbenchSurface, borderColor: palette.steel, borderRadius: 14, borderWidth: 1, padding: 20, width: '100%' },
  modalTitle: { color: palette.offWhite, fontSize: 18, fontWeight: '900', letterSpacing: 0.8, marginBottom: 12, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: palette.brassAccent, borderRadius: 9, padding: 16 },
  primaryButtonText: { color: palette.workbenchSurface, fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  secondaryButton: { alignItems: 'center', borderColor: palette.steel, borderRadius: 9, borderWidth: 1, padding: 14 },
  secondaryButtonText: { color: palette.offWhite, fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
  settingLabel: { color: palette.offWhite, fontSize: 13, fontWeight: '800', letterSpacing: 0.7 },
  settingRow: { alignItems: 'center', borderTopColor: palette.blueprintGrid, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  skinAction: { color: palette.brassAccent, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  skinName: { color: palette.offWhite, fontSize: 14, fontWeight: '900' },
  skinRow: { alignItems: 'center', borderTopColor: palette.blueprintGrid, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 },
  skinStatus: { color: palette.steel, fontSize: 9, fontWeight: '700', letterSpacing: 0.4, marginTop: 3 },
  stageBadge: { borderColor: palette.brassAccent, borderRadius: 8, borderWidth: 1, marginTop: 28, paddingHorizontal: 14, paddingVertical: 9 },
  stageText: { color: palette.brassAccent, fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  thread: { backgroundColor: palette.workbenchSurface, height: 2, position: 'absolute', width: 14 },
  title: { color: palette.offWhite, fontSize: 19, fontWeight: '900', letterSpacing: 1.1, marginTop: 2 },
});

