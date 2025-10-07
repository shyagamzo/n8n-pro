import React, { useEffect, useRef, useState } from 'react'

type PanelProps = {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export default function Panel({ title, onClose, children }: PanelProps): React.ReactElement
{
  const [position, setPosition] = useState({ x: 24, y: 24 })
  const [size, setSize] = useState({ w: 420, h: 560 })
  const dragging = useRef<null | { offsetX: number; offsetY: number }>(null)
  const resizing = useRef<null | { startX: number; startY: number; startW: number; startH: number }>(null)

  useEffect(() =>
  {
    function onMove(e: MouseEvent)
    {
      if (dragging.current)
      {
        setPosition({ x: e.clientX - dragging.current.offsetX, y: e.clientY - dragging.current.offsetY })
      }

      if (resizing.current)
      {
        const dx = e.clientX - resizing.current.startX
        const dy = e.clientY - resizing.current.startY
        setSize({ w: Math.max(320, resizing.current.startW + dx), h: Math.max(360, resizing.current.startH + dy) })
      }
    }

    function onUp()
    {
      dragging.current = null
      resizing.current = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () =>
    {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        width: size.w,
        height: size.h,
        background: 'var(--color-surface, #ffffff)',
        color: 'var(--color-text, #111827)',
        border: '1px solid var(--color-border, #e5e7eb)',
        borderRadius: 12,
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div
        onMouseDown={(e) =>
        {
          const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect()
          dragging.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: 'var(--color-surface-2, #f9fafb)',
          borderBottom: '1px solid var(--color-border, #e5e7eb)',
          cursor: 'move',
          userSelect: 'none'
        }}
      >
        <div style={{ fontWeight: 600 }}>{title}</div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer' }}>
          ×
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      <div
        onMouseDown={(e) =>
        {
          const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect()
          resizing.current = { startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height }
        }}
        style={{ position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, cursor: 'nwse-resize' }}
      />
    </div>
  )
}
