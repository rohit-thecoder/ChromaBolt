import {
  MAX_CAPACITY,
  NUT_COLORS,
  type Bolt,
  type GeneratedLevel,
  type Nut,
  type NutColor,
} from '@/types/game';
import { createPuzzleState, isPuzzleWon, tryMove } from './gameLogic';

interface ReverseMove {
  sourceBoltId: string;
  destinationBoltId: string;
  nutCount: number;
}

interface ReverseMoveCandidate extends ReverseMove {
  color: NutColor;
}

const EMPTY_BOLT_COUNT = 2;
const MAX_GENERATION_ATTEMPTS = 12;

const createSeededRandom = (seed: number): (() => number) => {
  let value = seed >>> 0;

  return (): number => {
    value += 0x6d2b79f5;
    let mixedValue = value;
    mixedValue = Math.imul(mixedValue ^ (mixedValue >>> 15), mixedValue | 1);
    mixedValue ^= mixedValue + Math.imul(mixedValue ^ (mixedValue >>> 7), mixedValue | 61);
    return ((mixedValue ^ (mixedValue >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const randomItem = <Item>(items: readonly Item[], random: () => number): Item =>
  items[Math.floor(random() * items.length)];

export const getColorCountForStage = (stageNumber: number): number => {
  if (stageNumber <= 3) {
    return 3;
  }

  if (stageNumber <= 8) {
    return 4;
  }

  if (stageNumber <= 14) {
    return 5;
  }

  if (stageNumber <= 24) {
    return 6;
  }

  return 7;
};

const getReverseMoveCount = (stageNumber: number, colorCount: number): number =>
  Math.min(12, 4 + colorCount + Math.floor(stageNumber / 24));

const createSolvedBolts = (stageNumber: number, colorCount: number): Bolt[] => {
  const colorBolts = NUT_COLORS.slice(0, colorCount).map((color, colorIndex) => ({
    id: `stage-${stageNumber}-bolt-${colorIndex + 1}`,
    nuts: Array.from({ length: MAX_CAPACITY }, (_, nutIndex): Nut => ({
      id: `stage-${stageNumber}-${color.toLowerCase()}-${nutIndex + 1}`,
      color,
    })),
  }));
  const spareBolts = Array.from({ length: EMPTY_BOLT_COUNT }, (_, spareIndex): Bolt => ({
    id: `stage-${stageNumber}-spare-${spareIndex + 1}`,
    nuts: [],
    isSpare: true,
  }));

  return [...colorBolts, ...spareBolts];
};

const getTopRunLength = (bolt: Bolt): number => {
  const topNut = bolt.nuts.at(-1);

  if (topNut === undefined) {
    return 0;
  }

  let runLength = 1;

  while (
    runLength < bolt.nuts.length &&
    bolt.nuts[bolt.nuts.length - runLength - 1].color === topNut.color
  ) {
    runLength += 1;
  }

  return runLength;
};

const getReverseMoveCandidates = (
  bolts: readonly Bolt[],
  previousMove: ReverseMove | undefined,
): ReverseMoveCandidate[] => {
  const candidates: ReverseMoveCandidate[] = [];

  for (const sourceBolt of bolts) {
    const topNut = sourceBolt.nuts.at(-1);

    if (topNut === undefined) {
      continue;
    }

    const topRunLength = getTopRunLength(sourceBolt);

    for (let nutCount = 1; nutCount <= topRunLength; nutCount += 1) {
      const remainingNutCount = sourceBolt.nuts.length - nutCount;
      const remainingTopNut = sourceBolt.nuts[remainingNutCount - 1];

      if (remainingNutCount > 0 && remainingTopNut.color !== topNut.color) {
        continue;
      }

      for (const destinationBolt of bolts) {
        const destinationTopNut = destinationBolt.nuts.at(-1);
        const reversesPreviousMove =
          previousMove !== undefined &&
          sourceBolt.id === previousMove.destinationBoltId &&
          destinationBolt.id === previousMove.sourceBoltId;

        if (
          sourceBolt.id === destinationBolt.id ||
          reversesPreviousMove ||
          destinationBolt.nuts.length + nutCount > MAX_CAPACITY ||
          destinationTopNut?.color === topNut.color
        ) {
          continue;
        }

        candidates.push({
          sourceBoltId: sourceBolt.id,
          destinationBoltId: destinationBolt.id,
          nutCount,
          color: topNut.color,
        });
      }
    }
  }

  return candidates;
};

const applyReverseMove = (bolts: readonly Bolt[], move: ReverseMove): Bolt[] =>
  bolts.map((bolt) => {
    if (bolt.id === move.sourceBoltId) {
      return {
        ...bolt,
        nuts: bolt.nuts.slice(0, -move.nutCount).map((nut) => ({ ...nut })),
      };
    }

    if (bolt.id === move.destinationBoltId) {
      const sourceBolt = bolts.find((candidate) => candidate.id === move.sourceBoltId);

      if (sourceBolt === undefined) {
        return bolt;
      }

      return {
        ...bolt,
        nuts: [
          ...bolt.nuts.map((nut) => ({ ...nut })),
          ...sourceBolt.nuts.slice(-move.nutCount).map((nut) => ({ ...nut })),
        ],
      };
    }

    return { ...bolt, nuts: bolt.nuts.map((nut) => ({ ...nut })) };
  });

const containsMixedBolt = (bolts: readonly Bolt[]): boolean =>
  bolts.some(
    (bolt) =>
      bolt.nuts.length > 1 &&
      bolt.nuts.some((nut) => nut.color !== bolt.nuts[0].color),
  );

const isSolvedInAtMostTwoMoves = (bolts: readonly Bolt[]): boolean => {
  if (isPuzzleWon(bolts)) {
    return true;
  }

  const startingState = createPuzzleState(bolts);

  for (const sourceBolt of bolts) {
    for (const destinationBolt of bolts) {
      const firstMove = tryMove(startingState, sourceBolt.id, destinationBolt.id);

      if (!firstMove.didMove) {
        continue;
      }

      if (isPuzzleWon(firstMove.state.bolts)) {
        return true;
      }

      for (const secondSourceBolt of firstMove.state.bolts) {
        for (const secondDestinationBolt of firstMove.state.bolts) {
          const secondMove = tryMove(
            firstMove.state,
            secondSourceBolt.id,
            secondDestinationBolt.id,
          );

          if (secondMove.didMove && isPuzzleWon(secondMove.state.bolts)) {
            return true;
          }
        }
      }
    }
  }

  return false;
};

const markMysteryNuts = (bolts: readonly Bolt[]): Bolt[] =>
  bolts.map((bolt) => ({
    ...bolt,
    nuts: bolt.nuts.map((nut, index) => ({
      ...nut,
      ...(index <= 1 ? { isMystery: true } : {}),
    })),
  }));

const shuffleSolvedBolts = (
  initialBolts: readonly Bolt[],
  reverseMoveCount: number,
  random: () => number,
): Bolt[] | undefined => {
  let bolts = initialBolts.map((bolt) => ({
    ...bolt,
    nuts: bolt.nuts.map((nut) => ({ ...nut })),
  }));
  let previousMove: ReverseMove | undefined;

  for (let moveIndex = 0; moveIndex < reverseMoveCount; moveIndex += 1) {
    const candidates = getReverseMoveCandidates(bolts, previousMove);

    if (candidates.length === 0) {
      return undefined;
    }

    const move = randomItem(candidates, random);
    bolts = applyReverseMove(bolts, move);
    previousMove = move;
  }

  return bolts;
};

/**
 * Builds a stable stage from a solved board. Each reverse move is the inverse
 * of a legal player move, so reversing this sequence always solves the level.
 */
export const generateLevel = (stageNumber: number): GeneratedLevel => {
  if (!Number.isInteger(stageNumber) || stageNumber < 1) {
    throw new Error('stageNumber must be a positive integer.');
  }

  const colorCount = getColorCountForStage(stageNumber);
  const reverseMoveCount = getReverseMoveCount(stageNumber, colorCount);
  const solvedBolts = createSolvedBolts(stageNumber, colorCount);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const random = createSeededRandom(stageNumber + attempt * 0x9e3779b9);
    const shuffledBolts = shuffleSolvedBolts(solvedBolts, reverseMoveCount, random);

    if (
      shuffledBolts !== undefined &&
      containsMixedBolt(shuffledBolts) &&
      !isPuzzleWon(shuffledBolts) &&
      !isSolvedInAtMostTwoMoves(shuffledBolts)
    ) {
      return {
        stageNumber,
        colorCount,
        reverseMoveCount,
        bolts: stageNumber % 5 === 0 ? markMysteryNuts(shuffledBolts) : shuffledBolts,
      };
    }
  }

  throw new Error(`Unable to generate a non-trivial puzzle for stage ${stageNumber}.`);
};

