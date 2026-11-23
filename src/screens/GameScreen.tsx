import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlueprintBackground } from '@/components/BlueprintBackground';
import { BoltAssembly, type BoltFeedback } from '@/components/BoltAssembly';
import {
  canMoveFromTo,
  createPuzzleState,
  getValidDestinations,
  isPuzzleWon,
  tryMove,
  undoLastMove,
} from '@/engine/gameLogic';
import { generateLevel } from '@/engine/levelGenerator';
import { adService, WorkshopAdModal, type RewardType } from '@/services/adService';
import { palette } from '@/theme/theme';
import type { Bolt, PuzzleState, SkinId } from '@/types/game';

const MAX_UNDO_CREDITS = 3;

const createStageState = (stageNumber: number): PuzzleState =>
  createPuzzleState(generateLevel(stageNumber).bolts);

const stageLabel = (stageNumber: number): string => stageNumber.toString().padStart(3, '0');

interface GameScreenProps {
  hapticsEnabled: boolean;
  onBack: () => void;
  onComplete: (movesUsed: number) => void;
  skin: SkinId;
  stageNumber: number;
}

export default function GameScreen({
  hapticsEnabled,
  onBack,
  onComplete,
  skin,
  stageNumber,
}: GameScreenProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const [puzzleState, setPuzzleState] = useState<PuzzleState>(() =>
    createStageState(stageNumber),
  );
  const [selectedBoltId, setSelectedBoltId] = useState<string | null>(null);
  const [undoCredits, setUndoCredits] = useState(MAX_UNDO_CREDITS);
  const [spareUsed, setSpareUsed] = useState(false);
  const [invalidSignals, setInvalidSignals] = useState<Record<string, number>>({});
  const [simulatedReward, setSimulatedReward] = useState<RewardType | null>(null);
  const [combo, setCombo] = useState(0);
  const [praise, setPraise] = useState<string | null>(null);

  useEffect(() => {
    setPuzzleState(createStageState(stageNumber));
    setSelectedBoltId(null);
    setUndoCredits(MAX_UNDO_CREDITS);
    setSpareUsed(false);
    setInvalidSignals({});
    setCombo(0);
    setPraise(null);
  }, [stageNumber]);

  const validDestinationIds = useMemo(() => {
    if (selectedBoltId === null) {
      return new Set<string>();
    }

    return new Set(
      getValidDestinations(puzzleState.bolts, selectedBoltId).map((bolt) => bolt.id),
    );
  }, [puzzleState.bolts, selectedBoltId]);
  const columnCount = Math.min(6, Math.max(3, Math.ceil(puzzleState.bolts.length / 2)));
  const cellWidth = Math.floor((width - 28) / columnCount);
  const solvedBoltCount = puzzleState.bolts.filter(
    (bolt) => bolt.nuts.length === 4 && bolt.nuts.every((nut) => nut.color === bolt.nuts[0]?.color),
  ).length;
  const occupiedBoltCount = puzzleState.bolts.filter((bolt) => bolt.nuts.length > 0).length;
  const finalStretch = occupiedBoltCount > 0 && (occupiedBoltCount - solvedBoltCount <= 1 || solvedBoltCount / occupiedBoltCount >= 0.85);

  const triggerInvalid = (boltId: string): void => {
    setInvalidSignals((signals) => ({
      ...signals,
      [boltId]: (signals[boltId] ?? 0) + 1,
    }));
  };

  const handleBoltPress = async (boltId: string): Promise<BoltFeedback> => {
    const tappedBolt = puzzleState.bolts.find((bolt) => bolt.id === boltId);

    if (tappedBolt === undefined) {
      triggerInvalid(boltId);
      return 'invalid';
    }

    if (selectedBoltId === null) {
      if (tappedBolt.nuts.length === 0) {
        triggerInvalid(boltId);
        return 'invalid';
      }

      setSelectedBoltId(boltId);
      return 'lift';
    }

    if (selectedBoltId === boltId) {
      setSelectedBoltId(null);
      return 'none';
    }

    const sourceBolt = puzzleState.bolts.find((bolt) => bolt.id === selectedBoltId);

    if (sourceBolt === undefined || !canMoveFromTo(sourceBolt, tappedBolt)) {
      triggerInvalid(boltId);
      return 'invalid';
    }

    const move = tryMove(puzzleState, selectedBoltId, boltId);

    if (!move.didMove) {
      triggerInvalid(boltId);
      return 'invalid';
    }

    setPuzzleState(move.state);
    setSelectedBoltId(null);
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    setPraise(nextCombo >= 4 ? 'MASTERWORK!' : nextCombo === 3 ? 'CLEAN!' : nextCombo === 2 ? 'PRECISION!' : '+10');
    return 'drop';
  };

  const restartStage = (): void => {
    setPuzzleState(createStageState(stageNumber));
    setSelectedBoltId(null);
    setUndoCredits(MAX_UNDO_CREDITS);
    setSpareUsed(false);
    setInvalidSignals({});
    setCombo(0);
    setPraise(null);
  };

  const useUndo = async (): Promise<void> => {
    if (undoCredits === 0) {
      const reward = await adService.requestReward('undoRefill');
      if (reward.rewarded) {
        setUndoCredits(MAX_UNDO_CREDITS);
      }
      if (reward.source === 'mock') {
        setSimulatedReward(reward.rewardType);
      }
      return;
    }

    const undoneMove = undoLastMove(puzzleState);

    if (!undoneMove.didMove) {
      return;
    }

    const remainingCredits = undoCredits - 1;
    setPuzzleState(undoneMove.state);
    setSelectedBoltId(null);
    setUndoCredits(remainingCredits);
    setCombo(0);

    if (remainingCredits === 0) {
      const reward = await adService.requestReward('undoRefill');
      if (reward.rewarded) {
        setUndoCredits(MAX_UNDO_CREDITS);
      }
      if (reward.source === 'mock') {
        setSimulatedReward(reward.rewardType);
      }
    }
  };

  const addAuxiliaryBolt = async (): Promise<void> => {
    if (spareUsed) {
      return;
    }

    const reward = await adService.requestReward('spareBolt');

    if (!reward.rewarded) {
      return;
    }

    if (reward.source === 'mock') {
      setSimulatedReward(reward.rewardType);
    }

    const capacity = stageNumber % 2 === 0 ? 1 : 4;
    const auxiliaryBolt: Bolt = {
      capacity,
      id: `stage-${stageNumber}-auxiliary`,
      isSpare: true,
      nuts: [],
    };

    setPuzzleState((state) => ({
      ...state,
      bolts: [...state.bolts, auxiliaryBolt],
    }));
    setSpareUsed(true);
  };

  return (
    <BlueprintBackground>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>‹</Text>
          </Pressable>
          <View style={styles.stageBadge}>
            <Text style={styles.stageLabel}>BLUEPRINT #{stageLabel(stageNumber)}</Text>
          </View>
          <Text style={styles.moveCounter}>MOVES {puzzleState.moveHistory.length}</Text>
          <Pressable onPress={restartStage} style={styles.restartButton}>
            <Text style={styles.restartText}>RESTART</Text>
          </Pressable>
        </View>
        {(combo > 1 || finalStretch) && <View style={[styles.telemetryRow, finalStretch && styles.finalStretch]}>
          {combo > 1 && <Text style={styles.comboText}>{combo >= 4 ? 'OVERDRIVE!' : `x${combo} COMBO`}</Text>}
          {finalStretch && <Text style={styles.finalText}>FINAL STRETCH</Text>}
        </View>}

        <View style={styles.playfield}>
          <View style={styles.grid}>
            {puzzleState.bolts.map((bolt) => (
              <View key={bolt.id} style={[styles.boltCell, { width: cellWidth }]}>
                <BoltAssembly
                  bolt={bolt}
                  hapticsEnabled={hapticsEnabled}
                  invalidSignal={invalidSignals[bolt.id] ?? 0}
                  isSelected={selectedBoltId === bolt.id}
                  isValidDestination={validDestinationIds.has(bolt.id)}
                  onPress={handleBoltPress}
                  skin={skin}
                />
              </View>
            ))}
          </View>
          <Text style={styles.playfieldCaption}>
            {selectedBoltId === null ? 'SELECT A BOLT' : 'THREAD ONTO A HIGHLIGHTED BOLT'}
          </Text>
          {praise !== null && <Text style={styles.praise}>{praise}</Text>}
        </View>

        <View style={styles.actionBar}>
          <Pressable
            disabled={puzzleState.moveHistory.length === 0 && undoCredits > 0}
            onPress={() => void useUndo()}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}>
            <Text style={styles.actionText}>UNDO ({undoCredits}/{MAX_UNDO_CREDITS})</Text>
          </Pressable>
          <Pressable
            disabled={spareUsed}
            onPress={() => void addAuxiliaryBolt()}
            style={({ pressed }) => [
              styles.actionButton,
              styles.spareButton,
              spareUsed && styles.disabledButton,
              pressed && styles.actionButtonPressed,
            ]}>
            <Text style={styles.spareText}>{spareUsed ? 'SPARE USED' : '+1 SPARE BOLT'}</Text>
          </Pressable>
        </View>

        {isPuzzleWon(puzzleState.bolts) && (
          <Pressable
            onPress={() => onComplete(puzzleState.moveHistory.length)}
            style={styles.nextStageButton}>
            <Text style={styles.nextStageText}>VERIFY BLUEPRINT</Text>
          </Pressable>
        )}
        <WorkshopAdModal
          message={
            simulatedReward === 'spareBolt'
              ? 'A sponsored tool grant has added an auxiliary brass bolt.'
              : 'A sponsored calibration grant has refilled all three undo credits.'
          }
          onClose={() => setSimulatedReward(null)}
          title={simulatedReward === 'spareBolt' ? 'AUXILIARY BOLT GRANTED' : 'UNDO CREDITS REFILLED'}
          visible={simulatedReward !== null}
        />
      </SafeAreaView>
    </BlueprintBackground>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: palette.blueprintGrid,
    borderColor: palette.steel,
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  actionButtonPressed: {
    opacity: 0.72,
  },
  actionText: {
    color: palette.offWhite,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  boltCell: {
    alignItems: 'center',
    height: 116,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.42,
  },
  grid: {
    alignContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  iconButton: {
    alignItems: 'center',
    borderColor: palette.steel,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconButtonText: {
    color: palette.offWhite,
    fontSize: 30,
    lineHeight: 32,
  },
  moveCounter: {
    color: palette.steel,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nextStageButton: {
    alignSelf: 'center',
    backgroundColor: palette.brassAccent,
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  nextStageText: {
    color: palette.workbenchSurface,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  playfield: {
    flex: 1,
    justifyContent: 'center',
  },
  playfieldCaption: {
    color: palette.steel,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 6,
    textAlign: 'center',
  },
  restartButton: {
    borderColor: palette.blueprintGrid,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  restartText: {
    color: palette.steel,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  safeArea: {
    flex: 1,
  },
  spareButton: {
    backgroundColor: palette.brassAccent,
    borderColor: palette.offWhite,
  },
  spareText: {
    color: palette.workbenchSurface,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stageBadge: {
    borderColor: palette.brassAccent,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  stageLabel: {
    color: palette.brassAccent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  telemetryRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 8 },
  comboText: { color: palette.offWhite, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  finalStretch: { borderColor: palette.brassAccent, borderRadius: 8, borderWidth: 1, marginHorizontal: 80, paddingVertical: 4 },
  finalText: { color: palette.brassAccent, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  praise: { color: palette.brassAccent, fontSize: 13, fontWeight: '900', letterSpacing: 1.2, marginTop: 9, textAlign: 'center' },
});

