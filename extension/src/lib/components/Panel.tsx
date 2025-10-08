import React, { useEffect, useRef, useState } from 'react'
import { STORAGE_KEYS, DEFAULTS } from '../constants'
import { storageGetMany, storageSet } from '../utils/storage'
import './Panel.css'

type PanelProps = {
  title: string
  onClose: () => void
  onNewSession?: () => void
  children: React.ReactNode
}

type PanelPosition = { x: number; y: number }
type PanelSize = { w: number; h: number }

function getDefaultPosition(): PanelPosition
{
  return {
    x: window.innerWidth - DEFAULTS.PANEL_WIDTH - DEFAULTS.PANEL_PADDING,
    y: window.innerHeight - DEFAULTS.PANEL_HEIGHT - DEFAULTS.PANEL_PADDING
  }
}

export default function Panel({ title, onClose, onNewSession, children }: PanelProps): React.ReactElement
{
  const [position, setPosition] = useState(getDefaultPosition())
  const [size, setSize] = useState<PanelSize>({ w: DEFAULTS.PANEL_WIDTH, h: DEFAULTS.PANEL_HEIGHT })
  const [isLoaded, setIsLoaded] = useState(false)
  const dragging = useRef<null | { offsetX: number; offsetY: number }>(null)
  const resizing = useRef<null | { startX: number; startY: number; startW: number; startH: number }>(null)

  // Load saved position and size from storage
  useEffect(() =>
  {
    void (async () =>
    {
      const result = await storageGetMany<{ [STORAGE_KEYS.PANEL_POSITION]: PanelPosition; [STORAGE_KEYS.PANEL_SIZE]: PanelSize }>([
        STORAGE_KEYS.PANEL_POSITION,
        STORAGE_KEYS.PANEL_SIZE
      ])

      const savedPosition = result[STORAGE_KEYS.PANEL_POSITION]
      const savedSize = result[STORAGE_KEYS.PANEL_SIZE]

      if (savedPosition)
      {
        setPosition(savedPosition)
      }

      if (savedSize)
      {
        setSize(savedSize)
      }

      setIsLoaded(true)
    })()
  }, [])

  // Save position when it changes
  useEffect(() =>
  {
    if (isLoaded)
    {
      void storageSet(STORAGE_KEYS.PANEL_POSITION, position)
    }
  }, [position, isLoaded])

  // Save size when it changes
  useEffect(() =>
  {
    if (isLoaded)
    {
      void storageSet(STORAGE_KEYS.PANEL_SIZE, size)
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
        setSize({
          w: Math.max(DEFAULTS.PANEL_MIN_WIDTH, resizing.current.startW + dx),
          h: Math.max(DEFAULTS.PANEL_MIN_HEIGHT, resizing.current.startH + dy)
        })
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
      className="panel"
      style={{
        top: position.y,
        left: position.x,
        width: size.w,
        height: size.h,
      }}
    >
      <div
        className="panel-header"
        onMouseDown={(e) =>
        {
          const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect()
          dragging.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top }
        }}
      >
        <div className="panel-title">{title}</div>
        <div className="panel-controls">
          {onNewSession && (
            <button
              className="panel-button"
              onClick={(e) =>
              {
                e.stopPropagation()
                onNewSession()
              }}
            >
              New Session
            </button>
          )}
          <button className="panel-close" onClick={onClose}>
            ×
          </button>
        </div>
      </div>
      <div className="panel-content">{children}</div>
      <div
        className="panel-resize-handle"
        onMouseDown={(e) =>
        {
          const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect()
          resizing.current = { startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height }
        }}
      />
    </div>
  )
}
