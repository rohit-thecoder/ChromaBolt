import {
  MAX_CAPACITY,
  type Bolt,
  type LiftedNuts,
  type MoveHistoryEntry,
  type MoveResult,
  type Nut,
  type PuzzleState,
} from '@/types/game';

const cloneNut = (nut: Nut): Nut => ({ ...nut });

const cloneBolt = (bolt: Bolt): Bolt => ({
  ...bolt,
  nuts: bolt.nuts.map(cloneNut),
});

const cloneHistoryEntry = (entry: MoveHistoryEntry): MoveHistoryEntry => ({
  ...entry,
  movedNuts: entry.movedNuts.map(cloneNut),
});

const clonePuzzleState = (state: PuzzleState): PuzzleState => ({
  bolts: state.bolts.map(cloneBolt),
  moveHistory: state.moveHistory.map(cloneHistoryEntry),
});

const getBoltIndex = (bolts: readonly Bolt[], boltId: string): number =>
  bolts.findIndex((bolt) => bolt.id === boltId);

export const getBoltCapacity = (bolt: Bolt): number => bolt.capacity ?? MAX_CAPACITY;

/** Returns the top nut plus every matching nut immediately below it. */
export const getLiftedNuts = (sourceBolt: Bolt): Nut[] => {
  const topNut = sourceBolt.nuts.at(-1);

  if (topNut === undefined) {
    return [];
  }

  let firstLiftedIndex = sourceBolt.nuts.length - 1;

  while (
    firstLiftedIndex > 0 &&
    sourceBolt.nuts[firstLiftedIndex - 1].color === topNut.color
  ) {
    firstLiftedIndex -= 1;
  }

  return sourceBolt.nuts.slice(firstLiftedIndex).map(cloneNut);
};

export const getLift = (sourceBolt: Bolt): LiftedNuts => ({
  sourceBoltId: sourceBolt.id,
  nuts: getLiftedNuts(sourceBolt),
});

/** A destination accepts a lift only when it has capacity and matching support. */
export const canPlaceNuts = (destinationBolt: Bolt, liftedNuts: readonly Nut[]): boolean => {
  const liftedTopNut = liftedNuts.at(-1);

  if (liftedTopNut === undefined) {
    return false;
  }

  if (getBoltCapacity(destinationBolt) - destinationBolt.nuts.length < liftedNuts.length) {
    return false;
  }

  const destinationTopNut = destinationBolt.nuts.at(-1);
  return destinationTopNut === undefined || destinationTopNut.color === liftedTopNut.color;
};

export const canMoveFromTo = (
  sourceBolt: Bolt,
  destinationBolt: Bolt,
): boolean =>
  sourceBolt.id !== destinationBolt.id &&
  canPlaceNuts(destinationBolt, getLiftedNuts(sourceBolt));

export const getValidDestinations = (
  bolts: readonly Bolt[],
  sourceBoltId: string,
): Bolt[] => {
  const sourceBolt = bolts.find((bolt) => bolt.id === sourceBoltId);

  if (sourceBolt === undefined) {
    return [];
  }

  return bolts.filter((bolt) => canMoveFromTo(sourceBolt, bolt));
};

/** Executes an immutable legal move and pushes enough information to undo it. */
export const tryMove = (
  state: PuzzleState,
  sourceBoltId: string,
  destinationBoltId: string,
): MoveResult => {
  const sourceIndex = getBoltIndex(state.bolts, sourceBoltId);
  const destinationIndex = getBoltIndex(state.bolts, destinationBoltId);

  if (sourceIndex < 0 || destinationIndex < 0 || sourceIndex === destinationIndex) {
    return { state, didMove: false };
  }

  const sourceBolt = state.bolts[sourceIndex];
  const destinationBolt = state.bolts[destinationIndex];
  const movedNuts = getLiftedNuts(sourceBolt);

  if (!canPlaceNuts(destinationBolt, movedNuts)) {
    return { state, didMove: false };
  }

  const nextState = clonePuzzleState(state);
  const nextSourceBolt = nextState.bolts[sourceIndex];
  const nextDestinationBolt = nextState.bolts[destinationIndex];
  const firstLiftedIndex = nextSourceBolt.nuts.length - movedNuts.length;

  nextSourceBolt.nuts.splice(firstLiftedIndex, movedNuts.length);
  nextDestinationBolt.nuts.push(...movedNuts.map(cloneNut));

  const newlyExposedNut = nextSourceBolt.nuts.at(-1);
  const revealedNutId = newlyExposedNut?.isMystery ? newlyExposedNut.id : undefined;

  if (newlyExposedNut !== undefined && revealedNutId !== undefined) {
    newlyExposedNut.isMystery = false;
  }

  nextState.moveHistory.push({
    sourceBoltId,
    destinationBoltId,
    movedNuts: movedNuts.map(cloneNut),
    ...(revealedNutId === undefined ? {} : { revealedNutId }),
  });

  return { state: nextState, didMove: true };
};

/** Restores the most recent move, including the mystery state of an exposed nut. */
export const undoLastMove = (state: PuzzleState): MoveResult => {
  const lastMove = state.moveHistory.at(-1);

  if (lastMove === undefined) {
    return { state, didMove: false };
  }

  const sourceIndex = getBoltIndex(state.bolts, lastMove.sourceBoltId);
  const destinationIndex = getBoltIndex(state.bolts, lastMove.destinationBoltId);

  if (sourceIndex < 0 || destinationIndex < 0 || sourceIndex === destinationIndex) {
    return { state, didMove: false };
  }

  const destinationBolt = state.bolts[destinationIndex];
  const movedNutIds = lastMove.movedNuts.map((nut) => nut.id);
  const destinationNutIds = destinationBolt.nuts
    .slice(-lastMove.movedNuts.length)
    .map((nut) => nut.id);

  if (
    movedNutIds.length === 0 ||
    movedNutIds.some((id, index) => id !== destinationNutIds[index])
  ) {
    return { state, didMove: false };
  }

  const nextState = clonePuzzleState(state);
  const nextSourceBolt = nextState.bolts[sourceIndex];
  const nextDestinationBolt = nextState.bolts[destinationIndex];

  nextDestinationBolt.nuts.splice(-lastMove.movedNuts.length, lastMove.movedNuts.length);
  nextSourceBolt.nuts.push(...lastMove.movedNuts.map(cloneNut));

  if (lastMove.revealedNutId !== undefined) {
    const exposedNut = nextSourceBolt.nuts.find(
      (nut) => nut.id === lastMove.revealedNutId,
    );

    if (exposedNut !== undefined) {
      exposedNut.isMystery = true;
    }
  }

  nextState.moveHistory.pop();
  return { state: nextState, didMove: true };
};

export const isPuzzleWon = (bolts: readonly Bolt[]): boolean =>
  bolts.every((bolt) => {
    if (bolt.nuts.length === 0 || (bolt.isSpare && bolt.capacity === 1)) {
      return true;
    }

    const firstColor = bolt.nuts[0].color;
    return (
      bolt.nuts.length === MAX_CAPACITY &&
      bolt.nuts.every((nut) => nut.color === firstColor)
    );
  });

export const createPuzzleState = (bolts: readonly Bolt[]): PuzzleState => ({
  bolts: bolts.map(cloneBolt),
  moveHistory: [],
});

