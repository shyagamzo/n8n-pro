import React, { useEffect, useRef, useState } from 'react'

type PanelProps = {
  title: string
  onClose: () => void
  onNewSession?: () => void
  children: React.ReactNode
}

const STORAGE_KEY_POSITION = 'n8n-pro-panel-position'
const STORAGE_KEY_SIZE = 'n8n-pro-panel-size'

function getDefaultPosition(): { x: number; y: number }
{
  // Position at bottom-right corner with some padding
  const padding = 24
  const defaultWidth = 420
  const defaultHeight = 560
  return {
    x: window.innerWidth - defaultWidth - padding,
    y: window.innerHeight - defaultHeight - padding
  }
}

export default function Panel({ title, onClose, onNewSession, children }: PanelProps): React.ReactElement
{
  const [position, setPosition] = useState(getDefaultPosition())
  const [size, setSize] = useState({ w: 420, h: 560 })
  const [isLoaded, setIsLoaded] = useState(false)
  const dragging = useRef<null | { offsetX: number; offsetY: number }>(null)
  const resizing = useRef<null | { startX: number; startY: number; startW: number; startH: number }>(null)

  // Load saved position and size from storage
  useEffect(() =>
  {
    chrome.storage.local.get([STORAGE_KEY_POSITION, STORAGE_KEY_SIZE], (result) =>
    {
      if (result[STORAGE_KEY_POSITION])
      {
        setPosition(result[STORAGE_KEY_POSITION])
      }
      if (result[STORAGE_KEY_SIZE])
      {
        setSize(result[STORAGE_KEY_SIZE])
      }
      setIsLoaded(true)
    })
  }, [])

  // Save position when it changes
  useEffect(() =>
  {
    if (isLoaded)
    {
      chrome.storage.local.set({ [STORAGE_KEY_POSITION]: position })
    }
  }, [position, isLoaded])

  // Save size when it changes
  useEffect(() =>
  {
    if (isLoaded)
    {
      chrome.storage.local.set({ [STORAGE_KEY_SIZE]: size })
    }
  }, [size, isLoaded])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onNewSession && (
            <button
              onClick={(e) =>
              {
                e.stopPropagation()
                onNewSession()
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border, #d1d5db)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: 12,
                cursor: 'pointer',
                color: 'var(--color-text, #111827)'
              }}
            >
              New Session
            </button>
          )}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer' }}>
            ×
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      <div
        onMouseDown={(e) =>
        {
          const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect()
          resizing.current = { startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height }
        }}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 20,
          height: 20,
          cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 50%, var(--color-border, #d1d5db) 50%)',
          borderBottomRightRadius: 12
        }}
      />
    </div>
  )
}
