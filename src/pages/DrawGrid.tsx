import { useMemo, useState } from 'react'
import BaseGridCanvas from '../components/grid/BaseGrid';
import DrawingGridCanvas from '../components/grid/DrawingGrid';
import { booleanArrayToDecimal, decimalToBooleanArray } from '../utils/functions';
import { GridDecimal, GridType } from '../utils/interface';

import { initGridData } from '../utils/mockData';

const canvases = [
  { i: 0, color: '#ff000066', zIndex: 20 },
  { i: 1, color: '#00ff0066', zIndex: 21 },
  { i: 2, color: '#0000ff66', zIndex: 22 },
  { i: 3, color: '#ffff0066', zIndex: 23 },
]

export default function DrawGrid() {
  const [gridData, setGridData] = useState<GridType[]>([]);
  const [gridDecimalData, setGridDecimalData] = useState<GridDecimal[]>(() => {
    return Array.from({ length: 3 }, () => {
      return Array(18).fill(0);
    });
  });
  const [activeCanvas, setActiveCanvas] = useState(0)
  const [isIsolated, setIsIsolated] = useState(false);

  const convertedInitData = useMemo(() => {
    setGridDecimalData(initGridData)
    return initGridData.map((grid) => {
      return grid.map((row) => {
        return decimalToBooleanArray(row);
      })
    })
  }, [])
  
  const handleGridChange = (i: number, newGrid: GridType) => {
    const newGridData = [...gridData];
    newGridData[i] = newGrid;
    setGridData(newGridData);

    const newGridDecimalData = [...gridDecimalData];
    newGridDecimalData[i] = newGrid.map((row) => booleanArrayToDecimal(row));
    setGridDecimalData(newGridDecimalData);
  };

  return (
    <div className='flex gap-3 p-3' style={{ height: 540 }}>
      <div>
        <div 
          className='relative' 
          style={{ width: 960, height: 540 }}
        >
          <img
            src='https://images.pexels.com/photos/26738322/pexels-photo-26738322.jpeg'
            className='object-cover w-full h-full'
            onContextMenu={(e) => e.preventDefault()}
          />
          {canvases.map((canvas, index) => (
            <DrawingGridCanvas
              key={canvas.i}
              fillColor={canvas.color}
              initialGrid={convertedInitData[index]}
              onGridChange={(grid) => handleGridChange(canvas.i, grid)}
              disabled={activeCanvas !== canvas.i}
              style={{
                display: !isIsolated || activeCanvas === canvas.i ? 'block' : 'none',
              }}
            />
          ))}
          <BaseGridCanvas />
        </div>
        <div className='flex'>
          {canvases.map((canvas) => (
            <button
              key={canvas.i}
              className='p-2 m-2'
              style={{ backgroundColor: canvas.color, color: canvas.i === activeCanvas ? 'white' : 'black' }}
              onClick={() => setActiveCanvas(canvas.i)}
            >
              {canvas.i}
            </button>
          ))}
          <button
            className='p-2 m-2'
            style={{ backgroundColor: isIsolated ? 'red' : 'green', color: 'white' }}
            onClick={() => setIsIsolated(!isIsolated)}
          >
            {isIsolated ? 'Isolated' : 'Combined'}
          </button>
        </div>
      </div>
      <div className='flex gap-2'>
        {gridDecimalData.map((grid, i) => (
          <div key={i} className='p-3 bg-neutral-300'>
            <p style={{ color: canvases[i].color}}>{`Data: ${i}`}</p>
            <pre className='text-xs'>{JSON.stringify(grid, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}
