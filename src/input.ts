import { GRID_SIZE } from './constants';
import type { GameState, Position } from './types';

/**
 * Callback invoked when the user selects a tile.
 */
export type SelectTileCallback = (position: Position) => void;

/**
 * Callback invoked when the user restarts the game.
 */
export type RestartCallback = () => void;

/**
 * Callback invoked whenever any input changes and the renderer should redraw.
 */
export type DirtyCallback = () => void;

/**
 * Attaches mouse, touch, and keyboard handlers to the document.
 */
export function attachInputHandlers(
  state: GameState,
  convertScreenToGrid: (x: number, y: number) => Position | null,
  onSelectTile: SelectTileCallback,
  onRestart: RestartCallback,
  onDirty: DirtyCallback,
): () => void {
  function handlePointer(x: number, y: number): void {
    if (state.gameOver) {
      onRestart();
      return;
    }
    const position = convertScreenToGrid(x, y);
    if (position) {
      onSelectTile(position);
    }
  }

  function onMouseDown(event: MouseEvent): void {
    handlePointer(event.clientX, event.clientY);
  }

  function onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    handlePointer(touch.clientX, touch.clientY);
  }

  function moveCursor(deltaRow: number, deltaCol: number): void {
    state.cursor = {
      col: Math.max(0, Math.min(GRID_SIZE - 1, state.cursor.col + deltaCol)),
      row: Math.max(0, Math.min(GRID_SIZE - 1, state.cursor.row + deltaRow)),
    };
    onDirty();
  }

  function onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
        moveCursor(-1, 0);
        break;
      case 'ArrowDown':
        moveCursor(1, 0);
        break;
      case 'ArrowLeft':
        moveCursor(0, -1);
        break;
      case 'ArrowRight':
        moveCursor(0, 1);
        break;
      case 'Enter':
      case ' ': {
        if (state.gameOver) {
          onRestart();
        } else {
          onSelectTile(state.cursor);
        }
        break;
      }
      case 'Escape':
        state.selected = null;
        onDirty();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('keydown', onKeyDown);

  return () => {
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('keydown', onKeyDown);
  };
}
