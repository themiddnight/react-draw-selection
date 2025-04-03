import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Group } from 'react-konva';
import Konva from 'konva';

interface Point {
  x: number;
  y: number;
}

interface PolygonDrawerProps {
  width?: number;
  height?: number;
  color?: string;
  initData?: Point[];
  onChange?: (points: Point[]) => void;
  onIsValid?: (isValid: boolean) => void;
}

const PolygonDrawer: React.FC<PolygonDrawerProps> = ({
  width = 1280,
  height = 720,
  color = '#ff0000',
  initData = [],
  onChange = () => {},
  onIsValid = () => {},
}) => {
  const [points, setPoints] = useState<Point[]>(initData);
  const [isDrawing, setIsDrawing] = useState<boolean>(initData.length === 0);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoverFirstPoint, setHoverFirstPoint] = useState<boolean>(false);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);

  // Convert between canvas coordinates and normalized coordinates (0-1000)
  const normalizePoint = (p: Point): Point => ({
    x: Math.round((p.x / width) * 1000),
    y: Math.round((p.y / height) * 1000),
  });

  const denormalizePoint = (p: Point): Point => ({
    x: (p.x / 1000) * width,
    y: (p.y / 1000) * height,
  });

  // Initialize with normalized initData
  useEffect(() => {
    if (initData.length > 0) {
      const denormalizedPoints = initData.map(denormalizePoint);
      setPoints(denormalizedPoints);
      setIsDrawing(false);
      checkPolygonValidity(denormalizedPoints);
    }
  }, [initData]);

  useEffect(() => {
    if (points.length >= 3) {
      onChange(points.map(normalizePoint));
      checkPolygonValidity(points);
    }
  }, [points]);

  // Check if lines intersect
  const doLinesIntersect = (
    a1: Point, 
    a2: Point, 
    b1: Point, 
    b2: Point
  ): boolean => {
    // Line segment intersection algorithm
    const det = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
    if (det === 0) return false; // Parallel lines
    
    const lambda = ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / det;
    const gamma = ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / det;
    
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  };

  // Check if polygon has self-intersections
  const checkPolygonValidity = (polyPoints: Point[]): void => {
    if (polyPoints.length < 3) {
      onIsValid(true);
      return;
    }
    
    let isValid = true;
    
    for (let i = 0; i < polyPoints.length; i++) {
      const a1 = polyPoints[i];
      const a2 = polyPoints[(i + 1) % polyPoints.length];
      
      for (let j = i + 2; j < polyPoints.length + (i > 0 ? 1 : 0) - 1; j++) {
        if (j >= polyPoints.length) continue;
        const b1 = polyPoints[j];
        const b2 = polyPoints[(j + 1) % polyPoints.length];
        
        if ((i !== 0 || j !== polyPoints.length - 1) && doLinesIntersect(a1, a2, b1, b2)) {
          isValid = false;
          break;
        }
      }
      
      if (!isValid) break;
    }
    
    onIsValid(isValid);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    setMousePos({
      x: pointerPos.x,
      y: pointerPos.y,
    });
    
    // Check if hovering over first point when drawing
    if (isDrawing && points.length >= 2) {
      const firstPoint = points[0];
      const dx = pointerPos.x - firstPoint.x;
      const dy = pointerPos.y - firstPoint.y;
      const isNearFirstPoint = Math.sqrt(dx * dx + dy * dy) < 10;
      setHoverFirstPoint(isNearFirstPoint);
      
      if (stageRef.current) {
        if (isNearFirstPoint) {
          stageRef.current.container().style.cursor = 'pointer';
        } else {
          stageRef.current.container().style.cursor = 'default';
        }
      }
    }
  };

  const handleCanvasClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) {
      if (e.target !== e.target.getStage()) {
        console.log('Clicked', e.target.id());
      }
      return;
    };
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    const newPoint = { x: pointerPos.x, y: pointerPos.y };
    
    // Check if clicking on first point to close polygon
    if (points.length >= 2 && hoverFirstPoint) {
      finishDrawing();
      return;
    }
    
    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    
    // Auto-finish if reaching 10 points
    if (newPoints.length === 10) {
      finishDrawing();
    }
  };

  const finishDrawing = () => {
    if (points.length >= 3) {
      setIsDrawing(false);
      if (stageRef.current) {
        stageRef.current.container().style.cursor = 'default';
      }
    }
  };

  const handlePointDragMove = (e: Konva.KonvaEventObject<DragEvent>, index: number) => {
    const newPoints = [...points];
    newPoints[index] = { x: e.target.x(), y: e.target.y() };
    setPoints(newPoints);
  };

  const removeLastPoint = () => {
    if (points.length > 0) {
      const newPoints = points.slice(0, -1);
      setPoints(newPoints);
    }
  };

  const clearPolygon = () => {
    setPoints([]);
    setIsDrawing(true);
    onChange([]);
    onIsValid(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDrawing) {
        if (e.key === 'Backspace') {
          removeLastPoint();
        } else if (e.key === 'Escape') {
          clearPolygon();
        }
      } else if (e.key === 'Delete') {
        clearPolygon();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, points]);

  const handlePolygonClick = () => {
    if (!isDrawing) {
      // setSelectedPointIndex(null);
    }
  };

  // Get all line points including the closing line
  const getLinePoints = () => {
    if (points.length === 0) return [];
    return points.flatMap(p => [p.x, p.y]);
  };

  return (
    <Stage
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onClick={handleCanvasClick}
      ref={stageRef}
      className='border border-gray-300 w-fit h-fit'
    >
      <Layer ref={layerRef}>
        {/* Filled Polygon */}
        {points.length >= 3 && (
          <Line
            points={getLinePoints()}
            closed={true}
            fill={color + '40'} // Adding 40 for 25% opacity
            onClick={handlePolygonClick}
          />
        )}
        
        {/* Lines between points */}
        {points.length > 0 && (
          <Line
            points={getLinePoints()}
            closed={!isDrawing && points.length >= 3}
            stroke={color}
            strokeWidth={2}
          />
        )}
        
        {/* Line from last point to cursor while drawing */}
        {isDrawing && points.length > 0 && (
          <Line
            points={[
              points[points.length - 1].x,
              points[points.length - 1].y,
              mousePos.x,
              mousePos.y,
            ]}
            stroke={color}
            strokeWidth={2}
            dash={[5, 5]}
          />
        )}
        
        {/* Points */}
        <Group>
          {points.map((point, index) => (
            <Circle
              key={index}
              x={point.x}
              y={point.y}
              radius={6}
              fill={index === 0 && isDrawing ? '#ff7700' : color}
              stroke="white"
              strokeWidth={2}
              draggable={!isDrawing}
              onDragMove={(e) => handlePointDragMove(e, index)}
              onMouseEnter={() => {
                if (stageRef.current && !isDrawing) {
                  stageRef.current.container().style.cursor = 'move';
                }
              }}
              onMouseLeave={() => {
                if (stageRef.current && !isDrawing) {
                  stageRef.current.container().style.cursor = 'default';
                }
              }}
              onClick={(e) => {
                e.cancelBubble = true;
                if (index === 0 && isDrawing && points.length >= 3) {
                  // Specific handler for first point to close polygon
                  finishDrawing();
                }
              }}
            />
          ))}
        </Group>
      </Layer>
    </Stage>
  );
};

export default PolygonDrawer;