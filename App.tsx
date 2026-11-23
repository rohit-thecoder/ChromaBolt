import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BlueprintBackground } from '@/components/BlueprintBackground';
import { HomeScreen } from '@/screens/HomeScreen';
import GameScreen from '@/screens/GameScreen';
import { StageCompleteScreen } from '@/screens/StageCompleteScreen';
import { StageSelectScreen } from '@/screens/StageSelectScreen';
import { adService, WorkshopAdModal } from '@/services/adService';
import { DEFAULT_GAME_STATE, loadGameState, updateGameState } from '@/storage/gameStorage';
import { setSoundEnabled } from '@/utils/soundManager';
import type { GameState } from '@/types/game';

type AppScreen =
  | { name: 'game'; stageNumber: number }
  | { name: 'home' }
  | { name: 'stage-complete'; coinsRewarded: number; movesUsed: number; stageNumber: number }
  | { name: 'stage-select' };

const getEfficiencyBonus = (movesUsed: number): number => Math.max(0, 20 - movesUsed) * 2;

export default function App(): React.JSX.Element {
  const [gameState, setGameState] = useState<GameState>(DEFAULT_GAME_STATE);
  const [screen, setScreen] = useState<AppScreen>({ name: 'home' });
  const [interstitialVisible, setInterstitialVisible] = useState(false);

  useEffect(() => {
    void loadGameState().then((savedState) => {
      setGameState(savedState);
      setSoundEnabled(savedState.soundEnabled);
    });
  }, []);

  const persistGameState = async (update: Partial<GameState>): Promise<void> => {
    const nextState = await updateGameState(update);
    setGameState(nextState);

    if (update.soundEnabled !== undefined) {
      setSoundEnabled(update.soundEnabled);
    }
  };

  const openStage = async (stageNumber: number): Promise<void> => {
    await persistGameState({ currentStage: stageNumber });
    setScreen({ name: 'game', stageNumber });
  };

  const completeStage = async (stageNumber: number, movesUsed: number): Promise<void> => {
    const coinsRewarded = 25 + getEfficiencyBonus(movesUsed);
    await persistGameState({
      coins: gameState.coins + coinsRewarded,
      highestUnlockedStage: Math.max(gameState.highestUnlockedStage, stageNumber + 1),
    });
    const interstitial = await adService.showInterstitialAfterLevel(stageNumber);
    setInterstitialVisible(interstitial.source === 'mock' && interstitial.shown);
    setScreen({ name: 'stage-complete', coinsRewarded, movesUsed, stageNumber });
  };

  const content = (() => {
    if (screen.name === 'stage-select') {
      return (
        <StageSelectScreen
          highestUnlockedStage={gameState.highestUnlockedStage}
          onBack={() => setScreen({ name: 'home' })}
          onSelectStage={(stageNumber) => void openStage(stageNumber)}
        />
      );
    }

    if (screen.name === 'game') {
      return (
        <GameScreen
          hapticsEnabled={gameState.hapticsEnabled}
          onBack={() => setScreen({ name: 'home' })}
          onComplete={(movesUsed) => void completeStage(screen.stageNumber, movesUsed)}
          skin={gameState.equippedSkin}
          stageNumber={screen.stageNumber}
        />
      );
    }

    if (screen.name === 'stage-complete') {
      return (
        <StageCompleteScreen
          coinsRewarded={screen.coinsRewarded}
          movesUsed={screen.movesUsed}
          onNext={() => void openStage(screen.stageNumber + 1)}
          stageNumber={screen.stageNumber}
        />
      );
    }

    return (
      <HomeScreen
        gameState={gameState}
        onContinue={() => void openStage(gameState.currentStage)}
        onOpenStageSelect={() => setScreen({ name: 'stage-select' })}
        onUpdateGameState={persistGameState}
      />
    );
  })();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <BlueprintBackground>{content}</BlueprintBackground>
        <WorkshopAdModal
          message="A short workshop sponsor message helps keep the blueprint archive supplied."
          onClose={() => setInterstitialVisible(false)}
          title="PRECISION TOOLS"
          visible={interstitialVisible}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

