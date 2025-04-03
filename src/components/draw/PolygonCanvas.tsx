import React, { useRef, useState, useEffect, MouseEvent } from 'react';

interface Point {
  x: number;
  y: number;
}

interface PolygonCanvasProps {
  color?: string;
  onChange?: (points: Point[]) => void;
  onIsValid?: (isValid: boolean) => void;
}

const PolygonCanvas: React.FC<PolygonCanvasProps> = ({ 
  color = "#ff0000", 
  onChange = () => {}, 
  onIsValid = () => {} 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(true);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Initialize canvas and add event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDrawing) return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (points.length > 0) {
          const newPoints = [...points];
          newPoints.pop();
          setPoints(newPoints);
          onChange(normalizePoints(newPoints));
          checkIfValid(newPoints);
        }
      } else if (e.key === 'Escape') {
        setPoints([]);
        setIsDrawing(true);
        onChange([]);
        onIsValid(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawing, points]);

  // Handle mouse movement
  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Update point position when dragging
    if (dragIndex !== null && isDragging) {
      const newPoints = [...points];
      newPoints[dragIndex] = { x, y };
      setPoints(newPoints);
      onChange(normalizePoints(newPoints));
      checkIfValid(newPoints);
    }
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clickPoint = { x, y };

    // Check if clicking on an existing point to start dragging
    const pointIndex = findPointIndex(clickPoint);
    if (pointIndex !== -1) {
      setDragIndex(pointIndex);
      setIsDragging(true);
      e.preventDefault(); // Prevent text selection during drag
    }
  };

  // Handle canvas click
  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!isDrawing) return; // Don't add points in edit mode

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clickPoint = { x, y };

    // Check if clicking near the first point to close the polygon
    if (points.length >= 3 && isNearPoint(clickPoint, points[0])) {
      finishDrawing();
      return;
    }

    // Add a new point
    const newPoints = [...points, clickPoint];
    setPoints(newPoints);
    onChange(normalizePoints(newPoints));
    checkIfValid(newPoints);

    // Auto-finish if we have 10 points
    if (newPoints.length >= 10) {
      finishDrawing();
    }
  };

  // Handle mouse up to finish dragging
  const handleMouseUp = () => {
    if (dragIndex !== null && isDragging) {
      setIsDragging(false);
      setDragIndex(null);
    }
  };

  // Normalize points to 0-1000 range
  const normalizePoints = (pts: Point[]): Point[] => {
    const canvas = canvasRef.current;
    if (!canvas || pts.length === 0) return [];

    return pts.map(p => ({
      x: Math.round((p.x / canvas.width) * 1000),
      y: Math.round((p.y / canvas.height) * 1000)
    }));
  };

  // Check if point is near another point (within 10px)
  const isNearPoint = (p1: Point, p2: Point, threshold = 10): boolean => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  };

  // Find the index of a point near the given coordinates
  const findPointIndex = (point: Point): number => {
    for (let i = 0; i < points.length; i++) {
      if (isNearPoint(point, points[i])) {
        return i;
      }
    }
    return -1;
  };

  // Check if lines intersect
  const doLinesIntersect = (a: Point, b: Point, c: Point, d: Point): boolean => {
    const denominator = ((b.x - a.x) * (d.y - c.y)) - ((b.y - a.y) * (d.x - c.x));
    if (denominator === 0) {
      return false; // Lines are parallel
    }

    const ua = (((c.x - a.x) * (d.y - c.y)) - ((c.y - a.y) * (d.x - c.x))) / denominator;
    const ub = (((c.x - a.x) * (b.y - a.y)) - ((c.y - a.y) * (b.x - a.x))) / denominator;

    // Check if intersection point is on both line segments
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
      return false;
    }

    return true;
  };

  // Check if polygon has intersecting lines
  const checkIfValid = (pts: Point[]): void => {
    if (pts.length < 3) {
      onIsValid(true);
      return;
    }

    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];

      for (let j = i + 2; j < pts.length + (i === 0 ? -1 : 0); j++) {
        if ((i === 0 && j === pts.length - 1) || Math.abs(i - j) <= 1) {
          continue; // Skip adjacent edges
        }

        const c = pts[j % pts.length];
        const d = pts[(j + 1) % pts.length];

        if (doLinesIntersect(a, b, c, d)) {
          onIsValid(false);
          return;
        }
      }
    }

    onIsValid(true);
  };

  // Finish drawing and switch to edit mode
  const finishDrawing = (): void => {
    if (points.length >= 3) {
      setIsDrawing(false);
      checkIfValid(points);
    }
  };

  // Change cursor style when hovering over a point
  const getCursorStyle = (): string => {
    if (!isDrawing && mousePos) {
      const pointIndex = findPointIndex(mousePos);
      if (pointIndex !== -1) {
        return 'cursor-move';
      }
    }
    return isDrawing ? 'cursor-crosshair' : 'cursor-default';
  };

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas dimensions to match displayed size
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    // Draw polygon
    if (points.length > 0) {
      // Draw filled polygon if we have at least 3 points
      if (points.length >= 3) {
        const fillColor = color.startsWith('#') 
          ? `${color}80` // Add 50% transparency if hex
          : color.replace(')', ', 0.5)').replace('rgb', 'rgba'); // Add transparency if rgb
        
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        
        // Close the shape while drawing
        if (isDrawing && mousePos) {
          ctx.lineTo(mousePos.x, mousePos.y);
        }
        
        ctx.closePath();
        ctx.fill();
      }

      // Draw lines
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      
      // Draw line to cursor if we're drawing
      if (isDrawing && mousePos) {
        ctx.lineTo(mousePos.x, mousePos.y);
        
        // Draw line back to first point if hovering near it and we have at least 3 points
        if (points.length >= 3 && mousePos && isNearPoint(mousePos, points[0])) {
          ctx.lineTo(points[0].x, points[0].y);
        }
      } else if (!isDrawing) {
        ctx.closePath();
      }
      
      ctx.stroke();

      // Draw points
      points.forEach((point, index) => {
        // Highlight the point being dragged or the first point in draw mode
        let pointColor = color;
        if ((dragIndex === index && isDragging) || (isDrawing && index === 0)) {
          pointColor = '#00bb44'; // Green for highlight
        } else if (!isDrawing && mousePos && isNearPoint(mousePos, point)) {
          pointColor = '#ffcc00'; // Yellow for hover in edit mode
        }

        ctx.fillStyle = pointColor;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw point outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
  }, [points, mousePos, isDrawing, color, dragIndex, isDragging]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full border border-gray-300 ${getCursorStyle()}`}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onClick={handleCanvasClick}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      tabIndex={0} // Make the canvas focusable for keyboard events
    />
  );
};

export default PolygonCanvas;