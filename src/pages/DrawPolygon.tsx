import { useMemo, useState } from 'react'
import PolygonMultiDrawer, { Shape } from '../components/draw/PolygonMultipleKonvaCanvas'

import { initPolygonData } from '../utils/mockData'

export default function DrawPolygon() {
  const [shapes, setShapes] = useState<Shape[]>([])

  const convertedInitData = useMemo(() => {
    return initPolygonData.map((shape) => {
      const points = shape.points.map((point) => ({
        x: point.x,
        y: 1000 - point.y, // Invert y-coordinate
      }))
      return {
        ...shape,
        points,
      }
    })
  }, [])

  function handleChange(shapes: Shape[]) {
    const newShapes = shapes.map(s => {
      s.points.map(p => {
        p.y = 1000 - p.y
        return p
      })
      return s
    })
    setShapes(newShapes)
  }

  return (
    <>
    <div className='flex gap-3 p-3'>
      <div className='relative shrink-0' style={{ height: 540, width: 960 }}>
        <img
          src='https://images.pexels.com/photos/26738322/pexels-photo-26738322.jpeg'
          className='object-cover w-full h-full'
          onContextMenu={(e) => e.preventDefault()}
        />
        <PolygonMultiDrawer onChange={handleChange} width={960} height={540} initData={convertedInitData} />
      </div>
      <div className='flex flex-col gap-3 w-full overflow-auto' style={{ height: 540 }}>
        <h2>Is Valid</h2>
        <pre className='text-xs w-full p-3 bg-neutral-200'>{shapes.map(s => s.isValid).join(', ')}</pre>
        <h2>Points</h2>
        <pre className='text-xs w-full p-3 bg-neutral-200'>{JSON.stringify(shapes, null, 2)}</pre>
      </div>
    </div>
    {/* <PolygonKonvaCanvas /> */}
    </>
  )
}

