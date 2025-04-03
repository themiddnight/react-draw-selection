import React, { useRef, useState, useEffect } from 'react';

const GridCanvas = () => {
  const canvasRef = useRef(null);
  const [grid, setGrid] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFilling, setIsFilling] = useState(true);
  const [startCell, setStartCell] = useState(null);
  const [currentCell, setCurrentCell] = useState(null);
  
  // Color for filled cells (can be customized)
  const FILL_COLOR = '#3b82f6'; // Blue color
  
  const GRID_WIDTH = 22;
  const GRID_HEIGHT = 18;
  
  // Initialize empty grid on component mount
  useEffect(() => {
    const initialGrid = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(false));
    setGrid(initialGrid);
  }, []);
  
  // Resize canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      
      drawGrid();
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [grid]);
  
  // Draw the grid when current rect changes
  useEffect(() => {
    drawGrid();
  }, [currentCell, isDrawing, grid]);
  
  // Get cell coordinates from mouse position
  const getCellFromMouse = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cellWidth = canvas.width / GRID_WIDTH;
    const cellHeight = canvas.height / GRID_HEIGHT;
    
    const cellX = Math.floor(x / cellWidth);
    const cellY = Math.floor(y / cellHeight);
    
    return { x: Math.min(Math.max(cellX, 0), GRID_WIDTH - 1), 
             y: Math.min(Math.max(cellY, 0), GRID_HEIGHT - 1) };
  };
  
  // Draw the entire grid
  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const cellWidth = canvas.width / GRID_WIDTH;
    const cellHeight = canvas.height / GRID_HEIGHT;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw filled cells
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          ctx.fillStyle = FILL_COLOR;
          ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        }
      });
    });
    
    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= GRID_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellWidth, 0);
      ctx.lineTo(x * cellWidth, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellHeight);
      ctx.lineTo(canvas.width, y * cellHeight);
      ctx.stroke();
    }
  };
  
  // Apply rectangle to grid - now happens instantly during drag
  const applyRectangle = (start, current) => {
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
  const handleMouseDown = (e) => {
    const cell = getCellFromMouse(e);
    setIsDrawing(true);
    setStartCell(cell);
    setCurrentCell(cell);
    
    // Determine if we're filling or unfilling based on initial cell
    setIsFilling(!grid[cell.y][cell.x]);
    
    // Apply rectangle instantly for the initial cell
    applyRectangle(cell, cell);
  };
  
  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const cell = getCellFromMouse(e);
    
    // Only update if the cell has changed
    if (!currentCell || cell.x !== currentCell.x || cell.y !== currentCell.y) {
      setCurrentCell(cell);
      // Apply rectangle instantly during drag
      applyRectangle(startCell, cell);
    }
  };
  
  const handleMouseUp = () => {
    setIsDrawing(false);
    setStartCell(null);
    setCurrentCell(null);
  };
  
  const handleMouseLeave = () => {
    setIsDrawing(false);
    setStartCell(null);
    setCurrentCell(null);
  };
  
  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default GridCanvas;