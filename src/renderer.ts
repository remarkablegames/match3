import { EMOJIS, GRID_SIZE } from './constants';
import type { GameState, Particle } from './types';

/**
 * Visual properties for a single tile.
 */
export interface VisualTile {
  /** X offset from logical grid position in pixels. */
  offsetX: number;
  /** Y offset from logical grid position in pixels. */
  offsetY: number;
  /** Scale factor (1 = normal). */
  scale: number;
  /** Opacity (0-1). */
  opacity: number;
}

/**
 * Canvas rendering context and dimensions.
 */
export interface Renderer {
  /** The canvas element. */
  readonly canvas: HTMLCanvasElement;
  /** Current tile size in pixels. */
  tileSize: number;
  /** Current board offset from the canvas left edge. */
  boardX: number;
  /** Current board offset from the canvas top edge. */
  boardY: number;
  /** Renders the complete frame. */
  render: (
    state: GameState,
    visuals: VisualTile[][],
    particles: Particle[],
  ) => void;
  /** Converts a screen position to grid coordinates. */
  screenToGrid: (x: number, y: number) => { col: number; row: number } | null;
}

const PADDING = 8;
const UI_HEIGHT = 48;

/**
 * Creates a fresh visual state matching the logical grid size.
 */
export function createVisuals(size: number): VisualTile[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      offsetX: 0,
      offsetY: 0,
      opacity: 1,
      scale: 1,
    })),
  );
}

/**
 * Initializes the canvas, sizes it to the container, and returns render helpers.
 */
export function createRenderer(
  container: HTMLElement,
  onResize?: () => void,
): Renderer {
  const canvas = document.createElement('canvas');
  canvas.id = 'game-canvas';
  container.appendChild(canvas);

  const rawContext = canvas.getContext('2d');
  if (!rawContext) {
    throw new Error('Canvas 2D context not supported');
  }
  const ctx = rawContext;

  const renderer: Renderer = {
    boardX: 0,
    boardY: 0,
    canvas,
    render: () => undefined,
    screenToGrid: () => null,
    tileSize: 0,
  };

  let tileSize = 0;
  let boardX = 0;
  let boardY = 0;

  function resize(): void {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${String(rect.width)}px`;
    canvas.style.height = `${String(rect.height)}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const availableWidth = rect.width - PADDING * 2;
    const availableHeight = rect.height - UI_HEIGHT - PADDING * 2;
    const boardDimension = Math.min(availableWidth, availableHeight);
    tileSize = boardDimension / GRID_SIZE;
    boardX = (rect.width - tileSize * GRID_SIZE) / 2;
    boardY = UI_HEIGHT + (rect.height - UI_HEIGHT - tileSize * GRID_SIZE) / 2;

    renderer.tileSize = tileSize;
    renderer.boardX = boardX;
    renderer.boardY = boardY;
    onResize?.();
  }

  resize();

  function getTileEmoji(value: number): string {
    return EMOJIS[value] ?? '?';
  }

  function drawBackground(): void {
    const { height, width } = canvas.getBoundingClientRect();
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#ffe4f3');
    gradient.addColorStop(0.5, '#e4f0ff');
    gradient.addColorStop(1, '#f3e5ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawBoard(): void {
    const boardDimension = tileSize * GRID_SIZE;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.roundRect(
      boardX - 4,
      boardY - 4,
      boardDimension + 8,
      boardDimension + 8,
      16,
    );
    ctx.fill();
    ctx.restore();
  }

  function drawTile(
    row: number,
    col: number,
    value: number,
    visual: VisualTile,
    selected: boolean,
    hovered: boolean,
  ): void {
    const x = boardX + col * tileSize + visual.offsetX;
    const y = boardY + row * tileSize + visual.offsetY;
    const size = tileSize - 6;
    const centerX = x + tileSize / 2;
    const centerY = y + tileSize / 2;

    ctx.save();
    ctx.globalAlpha = visual.opacity;
    ctx.translate(centerX, centerY);
    ctx.scale(visual.scale, visual.scale);

    if (selected || hovered) {
      ctx.shadowColor = selected
        ? 'rgba(255,105,180,0.6)'
        : 'rgba(100,149,237,0.4)';
      ctx.shadowBlur = 12;
    }

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2, size, size, 10);
    ctx.fill();

    if (selected) {
      ctx.strokeStyle = '#ff69b4';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (hovered) {
      ctx.strokeStyle = 'rgba(100,149,237,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.font = `${String(
      Math.floor(size * 0.7),
    )}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#333';
    ctx.fillText(getTileEmoji(value), 0, 2);

    ctx.restore();
  }

  function drawParticles(particles: Particle[]): void {
    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = particle.life / particle.maxLife;
      ctx.fillStyle = `hsl(${String(particle.hue)}, 90%, 60%)`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawUi(state: GameState): void {
    const { width } = canvas.getBoundingClientRect();
    ctx.save();
    ctx.font =
      'bold 18px "Comic Sans MS", "Chalkboard SE", "Trebuchet MS", sans-serif';
    ctx.textBaseline = 'middle';

    const parts: string[] = [];
    if (state.mode === 'levels') {
      parts.push(`Level: ${String(state.level)}`);
    }
    parts.push(`Score: ${String(state.score)}`);
    if (state.movesLeft !== null) {
      parts.push(`Moves: ${String(state.movesLeft)}`);
    }
    if (state.timeLeft !== null) {
      parts.push(`Time: ${String(Math.ceil(state.timeLeft))}`);
    }
    if (state.targetScore !== null) {
      parts.push(`Target: ${String(state.targetScore)}`);
    }

    const separator = ' | ';
    const partWidths = parts.map((part) => ctx.measureText(part).width);
    const separatorWidth = ctx.measureText(separator).width;
    const totalWidth =
      partWidths.reduce((sum, w) => sum + w, 0) +
      (parts.length - 1) * separatorWidth;
    let x = (width - totalWidth) / 2;
    const centerY = UI_HEIGHT / 2;

    for (let index = 0; index < parts.length; index += 1) {
      ctx.fillStyle = '#6a4c93';
      ctx.textAlign = 'left';
      ctx.fillText(parts[index], x, centerY);
      x += partWidths[index];
      if (index < parts.length - 1) {
        ctx.fillStyle = 'rgba(106, 76, 147, 0.4)';
        ctx.fillText(separator, x, centerY);
        x += separatorWidth;
      }
    }

    if (state.gameOver) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(0, 0, width, canvas.getBoundingClientRect().height);
      ctx.fillStyle = state.won ? '#4caf50' : '#f44336';
      ctx.font =
        'bold 42px "Comic Sans MS", "Chalkboard SE", "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        state.won ? 'You Win!' : 'Game Over',
        width / 2,
        canvas.getBoundingClientRect().height / 2 - 24,
      );
      ctx.font =
        '20px "Comic Sans MS", "Chalkboard SE", "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#333';
      ctx.fillText(
        'Press Enter or click to play again',
        width / 2,
        canvas.getBoundingClientRect().height / 2 + 24,
      );
    }

    ctx.restore();
  }

  function render(
    state: GameState,
    visuals: VisualTile[][],
    particles: Particle[],
  ): void {
    drawBackground();
    drawBoard();

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const value = state.grid[row][col];
        if (value === -1) {
          continue;
        }
        const selected =
          state.selected !== null &&
          state.selected.row === row &&
          state.selected.col === col;
        const hovered = state.cursor.row === row && state.cursor.col === col;
        drawTile(row, col, value, visuals[row][col], selected, hovered);
      }
    }

    drawParticles(particles);
    drawUi(state);
  }

  function screenToGrid(
    screenX: number,
    screenY: number,
  ): { col: number; row: number } | null {
    const rect = canvas.getBoundingClientRect();
    const x = screenX - rect.left - boardX;
    const y = screenY - rect.top - boardY;
    const col = Math.floor(x / tileSize);
    const row = Math.floor(y / tileSize);
    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) {
      return null;
    }
    return { col, row };
  }

  window.addEventListener('resize', resize);

  renderer.render = render;
  renderer.screenToGrid = screenToGrid;

  return renderer;
}
