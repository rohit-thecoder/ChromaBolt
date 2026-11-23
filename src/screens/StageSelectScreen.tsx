import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { WorkshopBannerAd } from '@/services/adService';
import { palette } from '@/theme/theme';

interface StageSelectScreenProps {
  highestUnlockedStage: number;
  onBack: () => void;
  onSelectStage: (stageNumber: number) => void;
}

const STAGES = Array.from({ length: 100 }, (_, index) => index + 1);

const getDifficulty = (stageNumber: number): string => {
  if (stageNumber % 5 === 0) {
    return 'MYSTERY NUT';
  }

  return stageNumber >= 25 ? 'HARD' : 'STANDARD';
};

export function StageSelectScreen({
  highestUnlockedStage,
  onBack,
  onSelectStage,
}: StageSelectScreenProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>BLUEPRINT ARCHIVE</Text>
          <Text style={styles.title}>STAGE SELECT</Text>
        </View>
      </View>
      <FlatList
        contentContainerStyle={styles.grid}
        data={STAGES}
        keyExtractor={(stage) => stage.toString()}
        numColumns={4}
        renderItem={({ item: stageNumber }) => {
          const unlocked = stageNumber <= highestUnlockedStage;
          const completed = stageNumber < highestUnlockedStage;

          return (
            <View style={styles.cell}>
              <Pressable
                disabled={!unlocked}
                onPress={() => onSelectStage(stageNumber)}
                style={({ pressed }) => [
                  styles.stageTile,
                  unlocked ? styles.unlockedTile : styles.lockedTile,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.stageNumber}>{stageNumber.toString().padStart(3, '0')}</Text>
                <Text style={styles.difficulty}>{unlocked ? getDifficulty(stageNumber) : 'LOCKED'}</Text>
                {completed && <Text style={styles.completed}>✓</Text>}
              </Pressable>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
      <WorkshopBannerAd />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: 'center', borderColor: palette.steel, borderRadius: 17, borderWidth: 1, height: 34, justifyContent: 'center', width: 34 },
  backText: { color: palette.offWhite, fontSize: 27, lineHeight: 29 },
  cell: { padding: 5, width: '25%' },
  completed: { color: palette.brassAccent, fontSize: 15, fontWeight: '900', position: 'absolute', right: 6, top: 4 },
  container: { flex: 1 },
  difficulty: { color: palette.steel, fontSize: 7, fontWeight: '900', letterSpacing: 0.35, marginTop: 5 },
  eyebrow: { color: palette.steel, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  grid: { padding: 14 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingVertical: 13 },
  lockedTile: { borderColor: palette.blueprintGrid, opacity: 0.48 },
  pressed: { opacity: 0.72 },
  stageNumber: { color: palette.offWhite, fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  stageTile: { alignItems: 'center', borderRadius: 8, borderWidth: 1, height: 72, justifyContent: 'center', overflow: 'hidden' },
  title: { color: palette.offWhite, fontSize: 18, fontWeight: '900', letterSpacing: 0.8, marginTop: 1 },
  unlockedTile: { backgroundColor: palette.blueprintGrid, borderColor: palette.steel },
});

