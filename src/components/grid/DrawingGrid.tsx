import { useRef, useState, useEffect } from 'react';
import { CellPosition, GridType } from '../../utils/interface';

interface Props {
  gridWidth?: number;
  gridHeight?: number;
  fillColor?: string;
  disabled?: boolean;
  initialGrid?: GridType;
  onGridChange?: (grid: GridType) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function DrawingGridCanvas({
  gridWidth = 22,
  gridHeight = 18,
  fillColor = '#ff000044',
  disabled = false,
  initialGrid = [],
  onGridChange,
  className,
  style,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isFilling, setIsFilling] = useState<boolean>(true);
  const [startCell, setStartCell] = useState<CellPosition | null>(null);
  const [grid, setGrid] = useState<GridType>(() => {
    if (initialGrid.length === gridHeight && initialGrid[0].length === gridWidth) {
      return initialGrid;
    }
    return Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false));
  });

  // Set up canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const parent = canvas.parentElement;
      if (!parent) return;

      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      drawGrid();
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redraw when grid changes
  useEffect(() => {
    drawGrid();

    // Notify parent about grid changes if callback provided
    if (onGridChange) {
      onGridChange(grid);
    }
  }, [grid]);

  // Get cell coordinates from mouse position
  const getCellFromMouse = (e: React.MouseEvent): CellPosition => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellWidth = canvas.width / gridWidth;
    const cellHeight = canvas.height / gridHeight;

    const cellX = Math.floor(x / cellWidth);
    const cellY = Math.floor(y / cellHeight);

    return {
      x: Math.min(Math.max(cellX, 0), gridWidth - 1),
      y: Math.min(Math.max(cellY, 0), gridHeight - 1)
    };
  };

  // Draw the filled cells (grid lines are on the base canvas)
  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellWidth = canvas.width / gridWidth;
    const cellHeight = canvas.height / gridHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw filled cells only
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          ctx.fillStyle = fillColor;
          ctx.fillRect(
            x * cellWidth,
            y * cellHeight,
            cellWidth,
            cellHeight
          );
        }
      });
    });
  };

  // Apply rectangle to grid
  const applyRectangle = (start: CellPosition, current: CellPosition) => {
    if (!start || !current) return;

    const minX = Math.min(start.x, current.x);
    const maxX = Math.max(start.x, current.x);
    const minY = Math.min(start.y, current.y);
    const maxY = Math.max(start.y, current.y);

    setGrid(prevGrid => {
      const newGrid = [...prevGrid];

      for (let y = minY; y <= maxY; y++) {
        newGrid[y] = [...newGrid[y]];
        for (let x = minX; x <= maxX; x++) {
          newGrid[y][x] = isFilling;
        }
      }

      return newGrid;
    });
  };

  // Handle mouse events
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    const cell = getCellFromMouse(e);
    applyRectangle(cell, cell);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    const cell = getCellFromMouse(e);
    setIsDrawing(true);
    setStartCell(cell);

    // Determine if we're filling or unfilling based on initial cell
    setIsFilling(!grid[cell.y][cell.x]);

    // Apply rectangle instantly for the initial cell
    applyRectangle(cell, cell);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled) return;
    if (!isDrawing || !startCell) return;
    const cell = getCellFromMouse(e);

    // Apply rectangle instantly during drag
    applyRectangle(startCell, cell);
  };

  const handleMouseUp = () => {
    if (disabled) return;
    setIsDrawing(false);
    setStartCell(null);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setIsDrawing(false);
    setStartCell(null);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
      className={`absolute top-0 left-0 right-0 bottom-0 pointer-events-none ${className || ''}`}
      style={{
        ...style, 
        zIndex: style?.zIndex || 'auto',
        pointerEvents: disabled ? 'none' : 'auto',
        cursor: disabled ? 'default' : 'crosshair',
      }}
    />
  );
};
