/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Circle, Group } from "react-konva";
import Konva from "konva";

const STROKE_WIDTH = 2;
const POINT_RADIUS = 4;

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  points: Point[];
  isValid: boolean;
  id: string; // Add an id to keep track of shapes even when reordering
}

interface PolygonDrawerProps {
  width?: number;
  height?: number;
  color?: string;
  highlightColor?: string;
  initData?: Shape[];
  maxShapes?: number;
  onChange?: (shapes: Shape[]) => void;
}

const PolygonMultiDrawer: React.FC<PolygonDrawerProps> = ({
  width = 1280,
  height = 720,
  color = "#ffaa00",
  highlightColor = "#00aaff",
  initData = [],
  maxShapes = 4,
  onChange = () => { },
}) => {
  // Generate a unique ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  // Add IDs to the initial data if they don't have them
  const initialShapesWithIds = initData.map((shape) => ({
    ...shape,
    id: shape.id || generateId(),
  }));

  const [shapes, setShapes] = useState<Shape[]>(initialShapesWithIds);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false); // Start not drawing
  const [canAddMoreShapes, setCanAddMoreShapes] = useState<boolean>(
    initialShapesWithIds.length < maxShapes
  );
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoverFirstPoint, setHoverFirstPoint] = useState<boolean>(false);
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(
    null
  );

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

  // Initialize with initData if provided
  useEffect(() => {
    if (initData.length > 0) {
      // Convert normalized points to canvas coordinates
      const denormalizedShapes = initData.map((shape) => ({
        ...shape,
        id: shape.id || generateId(),
        points: shape.points.map(denormalizePoint),
      }));
      setShapes(denormalizedShapes);
      setCanAddMoreShapes(denormalizedShapes.length < maxShapes);
    }
  }, [initData, maxShapes]);

  // Update parent component when shapes change
  useEffect(() => {
    // Convert to normalized coordinates for storage/API
    const normalizedShapes = shapes.map((shape) => ({
      ...shape,
      points: shape.points.map(normalizePoint),
    }));
    onChange(normalizedShapes);

    // Update the canAddMoreShapes state
    setCanAddMoreShapes(shapes.length < maxShapes);
  }, [shapes, maxShapes]);

  // Bring selected shape to front when selectedShapeIndex changes
  useEffect(() => {
    if (selectedShapeIndex !== null) {
      bringShapeToFront(selectedShapeIndex);
    }
  }, [selectedShapeIndex]);

  // Add keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDrawing) {
        switch (e.key) {
          case "Backspace":
          case "Delete":
            removeLastPoint();
            break;
          case "Enter":
            finishDrawing();
            break;
          case "Escape":
            cancelDrawing();
            break;
          default:
            break;
        }
      } else {
        switch (e.key) {
          case "Backspace":
          case "Delete":
            deleteSelectedShape();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawing, currentPoints, selectedShapeIndex, shapes]);

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

    const lambda =
      ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / det;
    const gamma =
      ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / det;

    return 0 < lambda && lambda < 1 && 0 < gamma && gamma < 1;
  };

  // Check if polygon has self-intersections
  const checkPolygonValidity = (polyPoints: Point[]): boolean => {
    if (polyPoints.length < 3) {
      return true;
    }

    for (let i = 0; i < polyPoints.length; i++) {
      const a1 = polyPoints[i];
      const a2 = polyPoints[(i + 1) % polyPoints.length];

      for (let j = i + 2; j < polyPoints.length + (i > 0 ? 1 : 0) - 1; j++) {
        if (j >= polyPoints.length) continue;
        const b1 = polyPoints[j];
        const b2 = polyPoints[(j + 1) % polyPoints.length];

        if (
          (i !== 0 || j !== polyPoints.length - 1) &&
          doLinesIntersect(a1, a2, b1, b2)
        ) {
          return false;
        }
      }
    }

    return true;
  };

  // Function to bring a shape to the front of the rendering order
  const bringShapeToFront = (index: number) => {
    if (index < 0 || index >= shapes.length) return;

    const updatedShapes = [...shapes];
    const shapeToMove = updatedShapes[index];

    // Remove the shape from its current position
    updatedShapes.splice(index, 1);
    // Add it to the end of the array (will be rendered last/top)
    updatedShapes.push(shapeToMove);

    // Update the selectedShapeIndex to the new position
    setShapes(updatedShapes);
    setSelectedShapeIndex(updatedShapes.length - 1);
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
    if (isDrawing && currentPoints.length >= 2) {
      const firstPoint = currentPoints[0];
      const dx = pointerPos.x - firstPoint.x;
      const dy = pointerPos.y - firstPoint.y;
      const isNearFirstPoint = Math.sqrt(dx * dx + dy * dy) < 10;
      setHoverFirstPoint(isNearFirstPoint);

      if (stageRef.current) {
        if (isNearFirstPoint) {
          stageRef.current.container().style.cursor = "pointer";
        } else if (selectedShapeIndex !== null) {
          stageRef.current.container().style.cursor = "default";
        } else {
          stageRef.current.container().style.cursor = "crosshair";
        }
      }
    }
  };

  const handleCanvasClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // If we're in drawing mode, we want to add points regardless of what was clicked
    if (isDrawing) {
      const stage = e.target.getStage();
      if (!stage) return;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const newPoint = { x: pointerPos.x, y: pointerPos.y };

      // Check if clicking on first point to close polygon
      if (currentPoints.length >= 2 && hoverFirstPoint) {
        finishDrawing();
        return;
      }

      const newPoints = [...currentPoints, newPoint];
      setCurrentPoints(newPoints);

      // Auto-finish if reaching 10 points
      if (newPoints.length === 10) {
        finishDrawing();
      }

      // Cancel event bubbling to prevent further handling
      e.cancelBubble = true;
      return;
    }

    // If we're here, we're not in drawing mode

    // Check if we clicked on the stage background (not a shape)
    if (stageRef.current && e.target === e.target.getStage()) {
      // Deselect any selected shape
      if (selectedShapeIndex !== null) {
        setSelectedShapeIndex(null);
        stageRef.current.container().style.cursor = "crosshair";
        return;
      }

      // If we can add more shapes, start drawing immediately with this first point
      if (canAddMoreShapes) {
        const stage = e.target.getStage();
        if (!stage) return;

        const pointerPos = stage.getPointerPosition();
        if (!pointerPos) return;

        // Start drawing mode and add the first point
        setIsDrawing(true);
        setCurrentPoints([{ x: pointerPos.x, y: pointerPos.y }]);
      }
    }
  };

  const finishDrawing = () => {
    if (currentPoints.length >= 3) {
      const isValid = checkPolygonValidity(currentPoints);
      const newShape: Shape = {
        points: currentPoints,
        isValid: isValid,
        id: generateId(),
      };

      // Add the new shape to our list
      setShapes([...shapes, newShape]);

      // Reset current points for the next shape
      setCurrentPoints([]);

      // Exit drawing mode
      setIsDrawing(false);

      if (stageRef.current) {
        stageRef.current.container().style.cursor = "default";
      }
    }
  };

  const cancelDrawing = () => {
    // Clear current points and exit drawing mode
    setCurrentPoints([]);
    setIsDrawing(false);

    if (stageRef.current) {
      stageRef.current.container().style.cursor = "crosshair";
    }
  };

  const handlePointDragMove = (
    e: Konva.KonvaEventObject<DragEvent>,
    shapeIndex: number,
    pointIndex: number
  ) => {
    if (shapeIndex === -1) {
      // We're dragging a point in the current shape being drawn
      const newPoints = [...currentPoints];
      newPoints[pointIndex] = { x: e.target.x(), y: e.target.y() };
      setCurrentPoints(newPoints);
    } else {
      // We're dragging a point in an existing shape
      const newShapes = [...shapes];
      const updatedShape = {
        ...newShapes[shapeIndex],
        points: [...newShapes[shapeIndex].points],
      };
      updatedShape.points[pointIndex] = { x: e.target.x(), y: e.target.y() };

      // Update validity of the shape
      updatedShape.isValid = checkPolygonValidity(updatedShape.points);

      newShapes[shapeIndex] = updatedShape;
      setShapes(newShapes);

      // Make sure this shape is selected
      if (selectedShapeIndex !== shapeIndex) {
        setSelectedShapeIndex(shapeIndex);
      }
    }
  };

  const handleShapeClick = (
    e: Konva.KonvaEventObject<MouseEvent>,
    shapeIndex: number
  ) => {
    // If in drawing mode, don't do anything special when clicking shapes
    if (isDrawing) return;

    // Otherwise select the shape
    e.cancelBubble = true; // Prevent the click from reaching the stage
    // If the shape is already selected, do nothing (we already brought it to front)
    if (selectedShapeIndex === shapeIndex) return;
    // Set the selected shape index - this will trigger the useEffect to bring it to front
    setSelectedShapeIndex(shapeIndex);
  };

  const removeLastPoint = () => {
    if (currentPoints.length > 0) {
      setCurrentPoints(currentPoints.slice(0, -1));

      // If we removed all points, exit drawing mode
      if (currentPoints.length === 1) {
        setIsDrawing(false);
      }
    }
  };

  const deleteSelectedShape = () => {
    if (selectedShapeIndex !== null) {
      const newShapes = shapes.filter((_, i) => i !== selectedShapeIndex);
      setShapes(newShapes);
      setSelectedShapeIndex(null);
    }
  };

  // Get all line points for a shape
  const getLinePoints = (points: Point[]) => {
    if (points.length === 0) return [];
    return points.flatMap((p) => [p.x, p.y]);
  };

  return (
    <Stage
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onClick={handleCanvasClick}
      ref={stageRef}
      className="absolute top-0 left-0 right-0 bottom-0 z-auto border border-gray-300 w-fit h-fit"
    >
      <Layer ref={layerRef}>
        {/* Existing Shapes */}
        {shapes.map((shape, shapeIndex) => (
          <Group key={`shape-${shape.id}`}>
            {/* Filled Polygon */}
            {shape.points.length >= 3 && (
              <Line
                points={getLinePoints(shape.points)}
                closed={true}
                fill={
                  (selectedShapeIndex === shapeIndex ? highlightColor : color) +
                  "40"
                }
                stroke={
                  selectedShapeIndex === shapeIndex ? highlightColor : color
                }
                strokeWidth={STROKE_WIDTH}
                onClick={(e) => handleShapeClick(e, shapeIndex)}
                onMouseEnter={() => {
                  if (stageRef.current && !isDrawing) {
                    stageRef.current.container().style.cursor = "default";
                  }
                }}
                onMouseLeave={() => {
                  if (stageRef.current && !isDrawing) {
                    if (selectedShapeIndex !== null) {
                      stageRef.current.container().style.cursor = "default";
                    } else {
                      stageRef.current.container().style.cursor = "crosshair";
                    }
                  }
                }}
              />
            )}

            {/* Points */}
            {shape.points.map((point, pointIndex) => (
              <Circle
                key={`shape-${shape.id}-point-${pointIndex}`}
                x={point.x}
                y={point.y}
                radius={POINT_RADIUS}
                fill={
                  selectedShapeIndex === shapeIndex ? highlightColor : color
                }
                stroke="white"
                strokeWidth={1}
                draggable={!isDrawing} // Only allow dragging when not drawing
                onDragMove={(e) =>
                  handlePointDragMove(e, shapeIndex, pointIndex)
                }
                onMouseEnter={() => {
                  if (stageRef.current && !isDrawing) {
                    stageRef.current.container().style.cursor = "move";
                  }
                }}
                onMouseLeave={() => {
                  if (stageRef.current && !isDrawing) {
                    if (selectedShapeIndex !== null) {
                      stageRef.current.container().style.cursor = "default";
                    } else {
                      stageRef.current.container().style.cursor = "crosshair";
                    }
                  }
                }}
                onClick={(e) => {
                  e.cancelBubble = true;
                  handleShapeClick(e, shapeIndex);
                }}
              />
            ))}
          </Group>
        ))}

        {/* Currently Drawing Shape */}
        {isDrawing && (
          <Group>
            {/* Filled Polygon in progress */}
            {currentPoints.length >= 2 && (
              <Line
                points={[...getLinePoints(currentPoints), mousePos.x, mousePos.y]}
                closed={true}
                fill={color + "40"}
              />
            )}

            {/* Lines between points */}
            {currentPoints.length > 0 && (
              <Line
                points={getLinePoints(currentPoints)}
                stroke={color}
                strokeWidth={STROKE_WIDTH}
              />
            )}

            {/* Line from last point to cursor */}
            {currentPoints.length > 0 && (
              <Line
                points={[
                  currentPoints[currentPoints.length - 1].x,
                  currentPoints[currentPoints.length - 1].y,
                  mousePos.x,
                  mousePos.y,
                ]}
                stroke={color}
                strokeWidth={STROKE_WIDTH}
                dash={[5, 5]}
              />
            )}

            {/* Points being drawn */}
            {currentPoints.map((point, index) => (
              <Circle
                key={`drawing-point-${index}`}
                x={point.x}
                y={point.y}
                radius={POINT_RADIUS}
                fill={index === 0 ? "#ff7700" : color}
                stroke="white"
                strokeWidth={STROKE_WIDTH}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (index === 0 && currentPoints.length >= 3) {
                    finishDrawing();
                  }
                }}
              />
            ))}
          </Group>
        )}
      </Layer>
    </Stage>
  );
};

export default PolygonMultiDrawer;
