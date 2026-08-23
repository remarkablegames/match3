import {
  BASE_MATCH_SCORE,
  COMBO_MULTIPLIER,
  type GameMode,
  GRID_SIZE,
  MODES,
  TILE_TYPES,
} from './constants';
import type { GameState, MatchResult, Position, TileType } from './types';

/**
 * Creates an empty grid of the given size.
 */
export function createEmptyGrid(rows: number, cols: number): TileType[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => -1),
  );
}

/**
 * Generates a random tile type index, optionally excluding one value.
 */
export function randomTileType(exclude?: TileType): TileType {
  let value: TileType;
  do {
    value = Math.floor(Math.random() * TILE_TYPES);
  } while (value === exclude);
  return value;
}

/**
 * Fills an empty grid with random tiles, ensuring no initial matches.
 */
export function createGrid(rows: number, cols: number): TileType[][] {
  const grid = createEmptyGrid(rows, cols);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let value: TileType;
      do {
        value = randomTileType();
      } while (
        (col >= 2 &&
          grid[row][col - 1] === value &&
          grid[row][col - 2] === value) ||
        (row >= 2 &&
          grid[row - 1][col] === value &&
          grid[row - 2][col] === value)
      );
      grid[row][col] = value;
    }
  }

  return grid;
}

/**
 * Checks whether two positions are orthogonally adjacent.
 */
export function areAdjacent(a: Position, b: Position): boolean {
  const rowDiff = Math.abs(a.row - b.row);
  const colDiff = Math.abs(a.col - b.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

/**
 * Finds all positions that are part of horizontal or vertical matches of
 * three or more identical tiles.
 */
export function findMatches(
  grid: readonly (readonly TileType[])[],
): Position[] {
  const rows = grid.length;
  /* v8 ignore next */
  const cols = grid[0]?.length ?? 0;
  const matched = new Set<string>();

  // Horizontal matches.
  for (let row = 0; row < rows; row += 1) {
    let runStart = 0;
    for (let col = 1; col <= cols; col += 1) {
      if (
        col < cols &&
        grid[row][col] === grid[row][runStart] &&
        grid[row][col] !== -1
      ) {
        continue;
      }
      if (col - runStart >= 3) {
        for (let k = runStart; k < col; k += 1) {
          matched.add(`${String(row)},${String(k)}`);
        }
      }
      runStart = col;
    }
  }

  // Vertical matches.
  for (let col = 0; col < cols; col += 1) {
    let runStart = 0;
    for (let row = 1; row <= rows; row += 1) {
      if (
        row < rows &&
        grid[row][col] === grid[runStart][col] &&
        grid[row][col] !== -1
      ) {
        continue;
      }
      if (row - runStart >= 3) {
        for (let k = runStart; k < row; k += 1) {
          matched.add(`${String(k)},${String(col)}`);
        }
      }
      runStart = row;
    }
  }

  return Array.from(matched).map((key) => {
    const [row, col] = key.split(',').map(Number) as [number, number];
    return { col, row };
  });
}

/**
 * Removes matched tiles by setting their value to -1 and returns a score for
 * the cleared group.
 */
export function clearMatches(
  grid: TileType[][],
  matches: readonly Position[],
): MatchResult {
  const matchedPositions: Position[] = [];

  for (const position of matches) {
    /* v8 ignore next */
    if (grid[position.row]?.[position.col] !== -1) {
      grid[position.row][position.col] = -1;
      matchedPositions.push(position);
    }
  }

  const count = matchedPositions.length;
  let score = BASE_MATCH_SCORE * count;
  if (count > 3) {
    score = Math.floor(score * (1 + (count - 3) * COMBO_MULTIPLIER));
  }

  return { matchedPositions, score };
}

/**
 * Applies gravity so tiles fall down into empty spaces and refills the top
 * rows with new random tiles.
 */
export function applyGravity(grid: TileType[][]): void {
  const rows = grid.length;
  /* v8 ignore next */
  const cols = grid[0]?.length ?? 0;

  for (let col = 0; col < cols; col += 1) {
    let writeRow = rows - 1;
    for (let row = rows - 1; row >= 0; row -= 1) {
      if (grid[row][col] !== -1) {
        grid[writeRow][col] = grid[row][col];
        if (writeRow !== row) {
          grid[row][col] = -1;
        }
        writeRow -= 1;
      }
    }
    for (let row = writeRow; row >= 0; row -= 1) {
      grid[row][col] = randomTileType();
    }
  }
}

/**
 * Swaps two tiles in the grid.
 */
export function swapTiles(grid: TileType[][], a: Position, b: Position): void {
  const temp = grid[a.row][a.col];
  grid[a.row][a.col] = grid[b.row][b.col];
  grid[b.row][b.col] = temp;
}

/**
 * Checks whether swapping two tiles would create at least one match.
 */
export function wouldCreateMatch(
  grid: readonly (readonly TileType[])[],
  a: Position,
  b: Position,
): boolean {
  const valueA = grid[a.row][a.col];
  const valueB = grid[b.row][b.col];
  const rows = grid.length;
  /* v8 ignore next */
  const cols = grid[0]?.length ?? 0;

  // Temporarily pretend the swap happened by checking around b for valueA.
  const check = (row: number, col: number, value: TileType): boolean => {
    const horizontal =
      (col >= 2 &&
        grid[row][col - 1] === value &&
        grid[row][col - 2] === value) ||
      (col + 2 < cols &&
        grid[row][col + 1] === value &&
        grid[row][col + 2] === value) ||
      (col >= 1 &&
        col + 1 < cols &&
        grid[row][col - 1] === value &&
        grid[row][col + 1] === value);

    const vertical =
      (row >= 2 &&
        grid[row - 1][col] === value &&
        grid[row - 2][col] === value) ||
      (row + 2 < rows &&
        grid[row + 1][col] === value &&
        grid[row + 2][col] === value) ||
      (row >= 1 &&
        row + 1 < rows &&
        grid[row - 1][col] === value &&
        grid[row + 1][col] === value);

    return horizontal || vertical;
  };

  return check(b.row, b.col, valueA) || check(a.row, a.col, valueB);
}

/**
 * Returns true if any valid move exists on the board.
 */
export function hasValidMoves(grid: readonly (readonly TileType[])[]): boolean {
  const rows = grid.length;
  /* v8 ignore next */
  const cols = grid[0]?.length ?? 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const current = { col, row };
      if (
        col + 1 < cols &&
        wouldCreateMatch(grid, current, { col: col + 1, row })
      ) {
        return true;
      }
      if (
        row + 1 < rows &&
        wouldCreateMatch(grid, current, { col, row: row + 1 })
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Creates a fresh grid that contains at least one valid move.
 */
export function createPlayableGrid(rows: number, cols: number): TileType[][] {
  let grid = createGrid(rows, cols);
  /* v8 ignore start */
  while (!hasValidMoves(grid)) {
    grid = createGrid(rows, cols);
  }
  /* v8 ignore stop */
  return grid;
}

/**
 * Creates the initial game state for the given mode.
 */
export function createGameState(mode: GameMode): GameState {
  const config = MODES[mode];
  return {
    busy: false,
    cursor: { col: Math.floor(GRID_SIZE / 2), row: Math.floor(GRID_SIZE / 2) },
    gameOver: false,
    grid: createPlayableGrid(GRID_SIZE, GRID_SIZE),
    mode,
    movesLeft: config.moveLimit,
    score: 0,
    selected: null,
    targetScore: config.targetScore,
    timeLeft: config.timeLimit,
    won: false,
  };
}

/**
 * Updates the timer for time mode. Should be called each frame.
 */
export function updateTimer(state: GameState, deltaSeconds: number): void {
  if (state.gameOver || state.timeLeft === null) {
    return;
  }
  state.timeLeft = Math.max(0, state.timeLeft - deltaSeconds);
  if (state.timeLeft <= 0) {
    state.gameOver = true;
    state.won = false;
  }
}

/**
 * Checks win/loss conditions after a move.
 */
export function checkEndConditions(state: GameState): void {
  if (state.gameOver) {
    return;
  }
  if (state.targetScore !== null && state.score >= state.targetScore) {
    state.gameOver = true;
    state.won = true;
    return;
  }
  if (state.movesLeft !== null && state.movesLeft <= 0) {
    state.gameOver = true;
    state.won = state.targetScore !== null && state.score >= state.targetScore;
  }
}

/**
 * Decrements the remaining move counter.
 */
export function useMove(state: GameState): void {
  if (state.movesLeft !== null) {
    state.movesLeft -= 1;
  }
}
