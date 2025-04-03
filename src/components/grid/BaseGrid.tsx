import React, { useRef, useEffect } from 'react';

interface BaseGridCanvasProps {
  gridWidth?: number;
  gridHeight?: number;
}

const BaseGridCanvas: React.FC<BaseGridCanvasProps> = ({
  gridWidth = 22,
  gridHeight = 18
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Resize canvas and draw grid on mount and resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      drawGrid();
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize)
    };
  }, [gridWidth, gridHeight]);

  // Draw grid lines only
  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellWidth = canvas.width / gridWidth;
    const cellHeight = canvas.height / gridHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#888888aa';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellWidth, 0);
      ctx.lineTo(x * cellWidth, canvas.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellHeight);
      ctx.lineTo(canvas.width, y * cellHeight);
      ctx.stroke();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      id='base-grid-canvas'
      className="absolute top-0 left-0 right-0 bottom-0 z-auto pointer-events-none cursor-none"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

export default BaseGridCanvas;