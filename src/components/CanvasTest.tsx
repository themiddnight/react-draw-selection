import { useEffect, useRef, useState } from 'react'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const dimensions = {
  w: 1280,
  h: 720,
}

export default function CanvasTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    setIsDragging(true)
    setRect({
      x: e.clientX,
      y: e.clientY,
      w: 0,
      h: 0,
    })
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    if (rect && isDragging) {
      setRect({
        ...rect,
        w: e.clientX - rect.x,
        h: e.clientY - rect.y,
      })
    } else {
      setIsDragging(false)
      setRect(null)
    }
  }

  function handleMouseUp() {
    setIsDragging(false)
    setRect(null)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const draw = () => {
      ctx.clearRect(0, 0, dimensions.w, dimensions.h)
      ctx.fillStyle = '#ff000088'
      if (!rect) return
      ctx.fillRect(rect?.x, rect?.y, rect?.w, rect?.h)
    }

    draw()
  }, [rect, isDragging])

  return (
    <div style={{ width: dimensions.w, height: dimensions.h }}>
      <canvas
        ref={canvasRef}
        className='bg-gray-300 w-full h-full'
        width={dimensions.w}
        height={dimensions.h}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      <code>{`X: ${rect?.x}, Y: ${rect?.y}, W: ${rect?.w}, H: ${rect?.h}`}</code>
    </div>
  )
}
